const express = require('express');
const { query } = require('express-validator');
const { protect, requireRole, ROLES } = require('../middleware/auth');
const {
  handleValidationErrors,
  asyncHandler,
  respondWithError
} = require('../middleware/validation');
const { getSupabaseServiceClient } = require('../config/supabase');
const customerRepository = require('../repositories/customerRepository');
const auditRepository = require('../repositories/auditRepository');

const router = express.Router();

router.use(protect);

// RFC 4180 quoting. A customer note containing a comma, a quote or a newline
// would otherwise shift every following column on that row.
//
// The leading apostrophe guard is for spreadsheet formula injection: Excel and
// Sheets evaluate a cell beginning = + - @ as a formula, so a customer whose
// name is `=HYPERLINK(...)` becomes a live link in whoever opens the export.
const toCsvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
};

const toCsv = (headers, rows) =>
  [
    headers.map((header) => toCsvCell(header.label)).join(','),
    ...rows.map((row) => headers.map((header) => toCsvCell(header.value(row))).join(','))
  ].join('\r\n');

const sendCsv = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Excel reads a UTF-8 file as the system codepage unless it sees a BOM,
  // which mangles any non-ASCII name in the export.
  res.send(`﻿${csv}`);
};

const CUSTOMER_COLUMNS = [
  { label: 'Customer code', value: (row) => row.customerCode },
  { label: 'Name', value: (row) => row.name },
  { label: 'Email', value: (row) => row.email },
  { label: 'Phone', value: (row) => row.phone },
  { label: 'WhatsApp', value: (row) => row.whatsappNumber },
  { label: 'City', value: (row) => row.city },
  { label: 'Country', value: (row) => row.country },
  { label: 'Status', value: (row) => row.status },
  { label: 'Service ID', value: (row) => row.serviceId },
  { label: 'Box', value: (row) => row.box },
  { label: 'MAC', value: (row) => row.mac },
  { label: 'Start date', value: (row) => row.startDate },
  { label: 'Expiry date', value: (row) => row.expiryDate },
  { label: 'Currency', value: (row) => row.currency },
  { label: 'Recurring amount', value: (row) => row.paymentSummary?.recurringAmount },
  { label: 'Total paid', value: (row) => row.paymentSummary?.totalPaid },
  { label: 'Available credit', value: (row) => row.paymentSummary?.availableCredit },
  { label: 'Outstanding', value: (row) => row.paymentSummary?.outstandingBalance },
  { label: 'Overdue', value: (row) => row.paymentSummary?.overdueAmount },
  { label: 'Active services', value: (row) => row.paymentSummary?.activeServiceCount },
  { label: 'Last payment', value: (row) => row.paymentSummary?.lastPaymentDate },
  { label: 'Portal enabled', value: (row) => (row.portalAccessEnabled ? 'yes' : 'no') },
  { label: 'Notes', value: (row) => row.note }
];

router.get(
  '/customers.csv',
  requireRole(ROLES.MODERATOR),
  [
    query('status').optional().isIn(['all', 'active', 'inactive', 'pending', 'suspended']),
    query('expiringWithinDays').optional().isInt({ min: 0, max: 365 })
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const customers = await customerRepository.getAll({
        search: req.query.search || '',
        status: req.query.status || '',
        expiringWithinDays: req.query.expiringWithinDays
      });

      // An export is a copy of the customer book leaving the system. That is
      // worth a record of who took it and when.
      await auditRepository.recordFromRequest(req, 'customers_exported', {
        entityType: 'report',
        metadata: { rowCount: customers.length, filters: req.query }
      });

      sendCsv(
        res,
        `customers-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(CUSTOMER_COLUMNS, customers)
      );
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to export customers' });
    }
  })
);

const RENEWAL_COLUMNS = [
  { label: 'Customer', value: (row) => row.customer_name },
  { label: 'Email', value: (row) => row.email },
  { label: 'Phone', value: (row) => row.phone },
  { label: 'Service', value: (row) => row.service_label || row.plan_name },
  { label: 'Status', value: (row) => row.status },
  { label: 'Expiry date', value: (row) => String(row.expiry_date || '').slice(0, 10) },
  { label: 'Days until expiry', value: (row) => row.days_until_expiry },
  { label: 'Currency', value: (row) => row.currency },
  { label: 'Amount', value: (row) => row.amount },
  { label: 'Discount', value: (row) => row.discount },
  { label: 'Paid this cycle', value: (row) => row.cycle_paid_amount },
  { label: 'Outstanding', value: (row) => row.outstanding_amount }
];

router.get(
  '/renewals.csv',
  requireRole(ROLES.MODERATOR),
  [query('withinDays').optional().isInt({ min: 0, max: 365 })],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const supabase = getSupabaseServiceClient();
      let request = supabase.from('renewal_overview').select('*');

      if (req.query.withinDays !== undefined) {
        request = request.lte('days_until_expiry', Number(req.query.withinDays));
      }

      const { data, error } = await request.order('expiry_date', { ascending: true }).limit(10000);

      if (error) {
        throw new Error(error.message);
      }

      sendCsv(
        res,
        `renewals-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(RENEWAL_COLUMNS, data || [])
      );
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to export renewals' });
    }
  })
);

// Revenue over time. There was no reporting of any kind before this -- the
// only revenue figure anywhere was "sum of the amount field of active
// customers", computed in the browser, which is a price list rather than
// revenue.
router.get(
  '/revenue',
  requireRole(ROLES.MODERATOR),
  [query('months').optional().isInt({ min: 1, max: 60 })],
  asyncHandler(async (req, res) => {
    try {
      const months = Number(req.query.months || 12);
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      since.setDate(1);

      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('revenue_by_month')
        .select('*')
        .gte('month', since.toISOString().slice(0, 10))
        .order('month', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        revenue: (data || []).map((row) => ({
          month: String(row.month).slice(0, 7),
          currency: row.currency,
          collected: Number(row.collected || 0).toFixed(2),
          refunded: Number(row.refunded || 0).toFixed(2),
          pending: Number(row.pending || 0).toFixed(2),
          paymentCount: Number(row.payment_count || 0)
        }))
      });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to load revenue' });
    }
  })
);

// The figures the dashboard used to assemble by downloading every customer and
// adding them up in the browser.
router.get('/summary', asyncHandler(async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();

    const [statusCounts, financials, expiring, openRequests] = await Promise.all([
      supabase.from('customers').select('status').is('deleted_at', null),
      supabase.from('customer_financials').select('*'),
      supabase
        .from('renewal_overview')
        .select('subscription_id', { count: 'exact', head: true })
        .gte('days_until_expiry', 0)
        .lte('days_until_expiry', 7),
      supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ]);

    for (const result of [statusCounts, financials, expiring, openRequests]) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    }

    const byStatus = (statusCounts.data || []).reduce((counts, row) => {
      counts[row.status] = (counts[row.status] || 0) + 1;
      return counts;
    }, {});

    const totals = (financials.data || []).reduce(
      (sum, row) => ({
        recurringAmount: sum.recurringAmount + Number(row.recurring_amount || 0),
        dueNow: sum.dueNow + Number(row.due_now || 0),
        overdueAmount: sum.overdueAmount + Number(row.overdue_amount || 0),
        totalPaid: sum.totalPaid + Number(row.total_paid || 0),
        availableCredit: sum.availableCredit + Number(row.available_credit || 0),
        outstandingBalance: sum.outstandingBalance + Number(row.outstanding_balance || 0)
      }),
      {
        recurringAmount: 0,
        dueNow: 0,
        overdueAmount: 0,
        totalPaid: 0,
        availableCredit: 0,
        outstandingBalance: 0
      }
    );

    res.json({
      success: true,
      summary: {
        totalCustomers: (statusCounts.data || []).length,
        byStatus,
        expiringSoon: expiring.count || 0,
        pendingServiceRequests: openRequests.count || 0,
        ...Object.fromEntries(
          Object.entries(totals).map(([key, value]) => [key, value.toFixed(2)])
        )
      }
    });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Unable to load the dashboard summary' });
  }
}));

module.exports = router;
