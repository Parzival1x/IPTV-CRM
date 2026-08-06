const bcrypt = require('bcryptjs');
const { getSupabaseServiceClient } = require('../config/supabase');
const { defaultCurrency, portalPasswordTtlHours } = require('../config/runtime');
const logger = require('../config/logger');
const {
  generateCustomerCode,
  generateServiceId,
  generateTransactionId,
  generatePortalPassword
} = require('../utils/ids');
const {
  paymentModeFromDb,
  normalizePaymentMode,
  mapSubscriptionStatus,
  parseNumeric,
  formatAmount,
  formatDate,
  normalizePhoneNumber,
  addMonths,
  buildExpiryDate
} = require('../utils/customerMapping');

const assertNoSupabaseError = (error, message) => {
  if (!error) {
    return;
  }

  const wrappedError = new Error(error.message || message);
  wrappedError.code = error.code;
  wrappedError.details = error.details;
  wrappedError.hint = error.hint;
  throw wrappedError;
};

const SUBSCRIPTION_SELECT = `
  id,
  customer_id,
  plan_id,
  activation_date,
  expiry_date,
  status,
  discount,
  auto_renew,
  service_label,
  service_code,
  transaction_id,
  payment_mode,
  amount,
  currency,
  cycle_paid_amount,
  device_box,
  device_mac,
  portal_url,
  billing_url,
  metadata,
  subscription_plans (
    id,
    plan_code,
    name,
    price,
    duration_days,
    duration_months,
    max_connections,
    description
  )
`;

const PAYMENT_SELECT = `
  id,
  customer_id,
  subscription_id,
  amount,
  discount,
  tax,
  final_amount,
  payment_mode,
  transaction_id,
  status,
  payment_date,
  next_due_date,
  currency,
  notes,
  payment_allocations (
    id,
    subscription_id,
    amount,
    renewed,
    consumed_at,
    customer_subscriptions (
      service_label
    )
  )
`;

const mapRowToSubscription = (row) => {
  if (!row) {
    return null;
  }

  const plan = Array.isArray(row.subscription_plans)
    ? row.subscription_plans[0]
    : row.subscription_plans || null;
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const netAmount = Math.max(parseNumeric(row.amount) - parseNumeric(row.discount), 0);
  const cyclePaid = parseNumeric(row.cycle_paid_amount);

  return {
    id: row.id,
    planId: row.plan_id || plan?.id || '',
    planCode: plan?.plan_code || row.service_code || '',
    planName: plan?.name || row.service_label || 'Service plan',
    description: plan?.description || '',
    status: mapSubscriptionStatus(row.status),
    activationDate: formatDate(row.activation_date),
    expiryDate: formatDate(row.expiry_date),
    discount: formatAmount(row.discount),
    autoRenew: Boolean(row.auto_renew),
    amount: formatAmount(row.amount),
    currency: row.currency || defaultCurrency,
    paymentMode: paymentModeFromDb[row.payment_mode] || 'Other',
    transactionId: row.transaction_id || '',
    serviceCode: row.service_code || '',
    serviceLabel: row.service_label || plan?.name || '',
    deviceBox: row.device_box || '',
    deviceMac: row.device_mac || '',
    portalUrl: row.portal_url || '',
    billingUrl: row.billing_url || '',
    maxConnections: Number(plan?.max_connections || metadata.maxConnections || 1),
    durationMonths: Number(plan?.duration_months || metadata.durationMonths || 12),
    features: Array.isArray(metadata.features) ? metadata.features : [],
    category: metadata.category || '',
    sku: metadata.sku || '',
    // How far the customer has paid into the current billing cycle. Before
    // this existed a part payment was written as a `pending` row that no
    // balance calculation counted, so the money disappeared from the UI.
    cyclePaidAmount: formatAmount(cyclePaid),
    outstandingAmount: formatAmount(Math.max(netAmount - cyclePaid, 0)),
    isPartiallyPaid: cyclePaid > 0 && cyclePaid < netAmount,
    metadata
  };
};

const mapRowToPayment = (row) => {
  if (!row) {
    return null;
  }

  const allocations = Array.isArray(row.payment_allocations) ? row.payment_allocations : [];
  const serviceAllocations = allocations.filter((allocation) => allocation.subscription_id);
  const creditAllocations = allocations.filter((allocation) => !allocation.subscription_id);

  const labelFor = (allocation) => {
    const subscription = Array.isArray(allocation.customer_subscriptions)
      ? allocation.customer_subscriptions[0]
      : allocation.customer_subscriptions;
    return subscription?.service_label || 'Service payment';
  };

  const serviceLabel = serviceAllocations.length === 0
    ? 'Account credit top-up'
    : serviceAllocations.length === 1
      ? labelFor(serviceAllocations[0])
      : `${serviceAllocations.length} services`;

  return {
    id: row.id,
    subscriptionId: row.subscription_id || null,
    serviceLabel,
    amount: formatAmount(row.amount),
    finalAmount: formatAmount(row.final_amount),
    discount: formatAmount(row.discount),
    tax: formatAmount(row.tax),
    currency: row.currency || defaultCurrency,
    paymentMode: paymentModeFromDb[row.payment_mode] || 'Other',
    status: row.status || 'paid',
    transactionId: row.transaction_id || '',
    paymentDate: row.payment_date || '',
    nextDueDate: formatDate(row.next_due_date),
    notes: row.notes || '',
    isRefundable: row.status === 'paid',
    allocations: allocations.map((allocation) => ({
      id: allocation.id,
      subscriptionId: allocation.subscription_id || null,
      serviceLabel: allocation.subscription_id ? labelFor(allocation) : 'Account credit',
      amount: formatAmount(allocation.amount),
      renewed: Boolean(allocation.renewed),
      consumed: Boolean(allocation.consumed_at)
    })),
    creditAmount: formatAmount(
      creditAllocations.reduce((sum, allocation) => sum + parseNumeric(allocation.amount), 0)
    )
  };
};

// The cached total_credit / already_given / remaining_credits columns are no
// longer written. They were maintained by application code across several
// un-batched writes, so a failure mid-sequence left them wrong, and their
// names did not describe what they held -- total_credit stored total *paid*,
// already_given stored the recurring amount. These numbers now come from the
// customer_financials view, computed from the payments and subscriptions that
// produced them, so they cannot drift.
const EMPTY_SUMMARY = {
  recurringAmount: '0.00',
  dueNow: '0.00',
  overdueAmount: '0.00',
  totalPaid: '0.00',
  totalRefunded: '0.00',
  availableCredit: '0.00',
  outstandingBalance: '0.00',
  dueSoonServiceCount: 0,
  overdueServiceCount: 0,
  activeServiceCount: 0,
  serviceCount: 0,
  lastPaymentDate: null
};

const mapFinancialsRow = (row) => {
  if (!row) {
    return { ...EMPTY_SUMMARY };
  }

  return {
    recurringAmount: formatAmount(row.recurring_amount),
    dueNow: formatAmount(row.due_now),
    overdueAmount: formatAmount(row.overdue_amount),
    totalPaid: formatAmount(row.total_paid),
    totalRefunded: formatAmount(row.total_refunded),
    availableCredit: formatAmount(row.available_credit),
    outstandingBalance: formatAmount(row.outstanding_balance),
    dueSoonServiceCount: Number(row.due_soon_service_count || 0),
    overdueServiceCount: Number(row.overdue_service_count || 0),
    activeServiceCount: Number(row.active_service_count || 0),
    serviceCount: Number(row.service_count || 0),
    lastPaymentDate: row.last_payment_date || null
  };
};

const mapRowToCustomer = (row, subscriptions = [], payments = [], summary = null) => {
  if (!row) {
    return null;
  }

  const paymentSummary = summary || { ...EMPTY_SUMMARY };

  return {
    id: row.id,
    customerCode: row.customer_code || '',
    serviceId: row.service_id || '',
    transactionId: row.transaction_id || '',
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    whatsappNumber: row.whatsapp_number || '',
    address: row.address || '',
    city: row.city || '',
    country: row.country || '',
    status: row.status || 'pending',
    avatar: row.avatar || '/images/user/user-02.png',
    role: row.role || 'customer',
    mac: row.mac || '',
    box: row.box || '',
    startDate: formatDate(row.start_date),
    paymentDate: formatDate(row.payment_date),
    paymentMode: paymentModeFromDb[row.payment_mode] || 'Other',
    amount: formatAmount(row.amount),
    currency: row.currency || defaultCurrency,
    expiryDate: formatDate(row.expiry_date),
    totalCredit: paymentSummary.totalPaid,
    alreadyGiven: paymentSummary.recurringAmount,
    remainingCredits: paymentSummary.availableCredit,
    note: row.notes || '',
    serviceDuration: row.service_duration ? String(row.service_duration) : '',
    portalAccessEnabled: row.portal_access_enabled !== false,
    portalResetRequired: row.portal_reset_required !== false,
    portalLastLogin: row.portal_last_login || null,
    portalPasswordExpiresAt: row.portal_password_expires_at || null,
    deletedAt: row.deleted_at || null,
    whatsappOptIn: row.whatsapp_opt_in !== false,
    emailOptIn: row.email_opt_in !== false,
    subscriptions,
    payments,
    paymentSummary
  };
};

const mapPayloadToRow = (payload) => {
  const row = {};
  const set = (key, column, transform = (value) => value) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      row[column] = transform(payload[key]);
    }
  };

  set('name', 'name', (value) => String(value).trim());
  set('customerCode', 'customer_code', (value) => value || null);
  set('serviceId', 'service_id', (value) => value || null);
  set('transactionId', 'transaction_id', (value) => value || null);
  set('email', 'email', (value) => (value ? String(value).trim().toLowerCase() : null));
  set('phone', 'phone', normalizePhoneNumber);
  set('whatsappNumber', 'whatsapp_number', normalizePhoneNumber);
  set('address', 'address', (value) => value || null);
  set('city', 'city', (value) => value || null);
  set('country', 'country', (value) => value || null);
  set('status', 'status', (value) => value || 'pending');
  set('avatar', 'avatar', (value) => value || '/images/user/user-02.png');
  set('role', 'role', (value) => value || 'customer');
  set('mac', 'mac', (value) => value || null);
  set('box', 'box', (value) => value || null);
  set('startDate', 'start_date', (value) => value || null);
  set('paymentDate', 'payment_date', (value) => value || null);
  set('paymentMode', 'payment_mode', normalizePaymentMode);
  set('amount', 'amount', parseNumeric);
  set('currency', 'currency', (value) => String(value || defaultCurrency).toUpperCase());
  set('expiryDate', 'expiry_date', (value) => value || null);
  set('note', 'notes', (value) => value || null);
  set('serviceDuration', 'service_duration', (value) => (value ? Number(value) : null));
  set('portalAccessEnabled', 'portal_access_enabled', Boolean);
  set('portalResetRequired', 'portal_reset_required', Boolean);
  set('whatsappOptIn', 'whatsapp_opt_in', Boolean);
  set('emailOptIn', 'email_opt_in', Boolean);

  return row;
};

const createUniqueReference = async (column, generator) => {
  const supabase = getSupabaseServiceClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generator();
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq(column, candidate)
      .maybeSingle();

    assertNoSupabaseError(error, `Unable to validate ${column}`);

    if (!data) {
      return candidate;
    }
  }

  throw new Error(`Unable to generate a unique ${column}`);
};

const getFinancialsFor = async (customerIds) => {
  const ids = customerIds.filter(Boolean);

  if (ids.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customer_financials')
    .select('*')
    .in('customer_id', ids);

  assertNoSupabaseError(error, 'Unable to fetch customer financials');

  return new Map((data || []).map((row) => [row.customer_id, mapFinancialsRow(row)]));
};

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

// Previously this upserted on plan_code every time any service was saved, so
// giving one customer a negotiated price on IPTV-PRE-001 rewrote that plan's
// price, duration and connection limit for every other customer on it. The
// plan catalogue is shared data; per-customer pricing belongs on the
// subscription row, where it already lives. This now only ever creates a plan
// that does not exist, and never modifies one that does.
const resolveSubscriptionPlan = async (service) => {
  const supabase = getSupabaseServiceClient();
  const planCode = service.planCode || null;

  if (planCode) {
    const { data: existing, error: lookupError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_code', planCode)
      .maybeSingle();

    assertNoSupabaseError(lookupError, 'Unable to look up subscription plan');

    if (existing) {
      return existing;
    }
  }

  const row = {
    plan_code: planCode,
    name: service.name || 'Primary IPTV Service',
    price: service.amount,
    duration_days: service.durationMonths * 30,
    duration_months: service.durationMonths,
    max_connections: service.maxConnections,
    currency: service.currency || defaultCurrency,
    description: service.description || null,
    is_active: true
  };

  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(row)
    .select('*')
    .single();

  // Another request may have created the same plan_code between the lookup and
  // the insert. Re-read rather than failing the customer's save.
  if (error?.code === '23505' && planCode) {
    const { data: raced, error: reReadError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_code', planCode)
      .single();

    assertNoSupabaseError(reReadError, 'Unable to resolve subscription plan after a conflict');
    return raced;
  }

  assertNoSupabaseError(error, 'Unable to create subscription plan');
  return data;
};

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const mapPayloadToService = (service, fallbackPayload) => {
  const activationDate =
    service.startDate ||
    service.activationDate ||
    fallbackPayload.startDate ||
    fallbackPayload.paymentDate ||
    new Date().toISOString().slice(0, 10);
  const parsedMonths = Number(
    service.durationMonths || service.duration || fallbackPayload.serviceDuration || 12
  );
  const durationMonths = Number.isFinite(parsedMonths) && parsedMonths > 0
    ? Math.min(Math.round(parsedMonths), 36)
    : 12;

  return {
    planCode: String(
      service.planCode ||
        service.templateId ||
        service.serviceCode ||
        fallbackPayload.serviceId ||
        'LEGACY-IPTV'
    ).trim(),
    name: String(service.name || service.serviceLabel || 'Primary IPTV Service').trim(),
    description: String(service.description || '').trim(),
    category: String(service.category || '').trim(),
    sku: String(service.sku || '').trim(),
    amount: parseNumeric(service.amount ?? fallbackPayload.amount),
    currency: String(service.currency || fallbackPayload.currency || defaultCurrency).toUpperCase(),
    paymentMode: normalizePaymentMode(service.paymentMode || fallbackPayload.paymentMode),
    activationDate,
    expiryDate: buildExpiryDate(
      activationDate,
      service.expiryDate || fallbackPayload.expiryDate,
      durationMonths
    ),
    // Months, not months * 30. The old code stored 360 days for a 12-month
    // plan while subscription creation used calendar arithmetic, so every
    // renewal came out five days short of the year that was paid for.
    durationMonths,
    maxConnections: Number(service.maxConnections) > 0 ? Number(service.maxConnections) : 1,
    status: mapSubscriptionStatus(
      service.status || (fallbackPayload.status === 'inactive' ? 'expired' : fallbackPayload.status)
    ),
    transactionId: String(service.transactionId || fallbackPayload.transactionId || '').trim() || null,
    serviceCode:
      String(service.serviceCode || service.planCode || fallbackPayload.serviceId || '').trim() || null,
    serviceLabel: String(service.serviceLabel || service.name || '').trim() || null,
    deviceBox: String(service.box || service.deviceBox || fallbackPayload.box || '').trim() || null,
    deviceMac: String(service.mac || service.deviceMac || fallbackPayload.mac || '').trim() || null,
    portalUrl: String(service.portalUrl || '').trim() || null,
    billingUrl: String(service.billingUrl || '').trim() || null,
    features: Array.isArray(service.features) ? service.features.filter(Boolean) : [],
    autoRenew: Boolean(service.autoRenew),
    discount: parseNumeric(service.discount),
    metadata: {
      category: String(service.category || '').trim() || null,
      sku: String(service.sku || '').trim() || null,
      features: Array.isArray(service.features) ? service.features.filter(Boolean) : [],
      templateId: String(service.templateId || service.planCode || '').trim() || null,
      maxConnections: Number(service.maxConnections) > 0 ? Number(service.maxConnections) : 1,
      durationMonths
    }
  };
};

const buildServicePayloads = (payload) => {
  if (Array.isArray(payload.services) && payload.services.length > 0) {
    return payload.services.map((service) => mapPayloadToService(service, payload));
  }

  return [
    mapPayloadToService(
      {
        planCode: payload.serviceId || 'LEGACY-IPTV',
        name: payload.role || 'Primary IPTV Service'
      },
      payload
    )
  ];
};

const buildSubscriptionRow = (customerId, service, planId) => ({
  customer_id: customerId,
  plan_id: planId,
  activation_date: service.activationDate,
  expiry_date: service.expiryDate,
  status: service.status,
  discount: service.discount,
  auto_renew: service.autoRenew,
  service_label: service.serviceLabel || service.name,
  service_code: service.serviceCode || service.planCode || null,
  transaction_id: service.transactionId,
  payment_mode: service.paymentMode,
  amount: service.amount,
  currency: service.currency,
  device_box: service.deviceBox,
  device_mac: service.deviceMac,
  portal_url: service.portalUrl,
  billing_url: service.billingUrl,
  metadata: service.metadata
});

const createSubscriptionsForCustomer = async (customerId, payload) => {
  const supabase = getSupabaseServiceClient();
  const services = buildServicePayloads(payload);
  const rows = [];

  for (const service of services) {
    const plan = await resolveSubscriptionPlan(service);
    rows.push(buildSubscriptionRow(customerId, service, plan.id));
  }

  const { error } = await supabase.from('customer_subscriptions').insert(rows);
  assertNoSupabaseError(error, 'Unable to create customer subscriptions');
};

const saveServiceSubscription = async (customerId, service, existingSubscriptionId = null) => {
  const supabase = getSupabaseServiceClient();
  const normalizedService = mapPayloadToService(service, service);
  const plan = await resolveSubscriptionPlan(normalizedService);
  const row = buildSubscriptionRow(customerId, normalizedService, plan.id);

  if (existingSubscriptionId) {
    const { error } = await supabase
      .from('customer_subscriptions')
      .update(row)
      .eq('id', existingSubscriptionId)
      .eq('customer_id', customerId);

    assertNoSupabaseError(error, 'Unable to update customer service');
    return existingSubscriptionId;
  }

  const { data, error } = await supabase
    .from('customer_subscriptions')
    .insert(row)
    .select('id')
    .single();

  assertNoSupabaseError(error, 'Unable to add customer service');
  return data.id;
};

// Fields on the flat customer record that mirror the primary subscription.
// Touching any of them is what makes a customer update a subscription update;
// changing a name or an address is not.
const SUBSCRIPTION_MIRRORED_FIELDS = [
  'amount',
  'expiryDate',
  'startDate',
  'paymentMode',
  'paymentDate',
  'mac',
  'box',
  'serviceDuration',
  'serviceId',
  'transactionId',
  'services',
  'status',
  'role'
];

const touchesSubscription = (updates) =>
  SUBSCRIPTION_MIRRORED_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(updates, field)
  );

const syncPrimarySubscription = async (customer) => {
  const supabase = getSupabaseServiceClient();
  const { data: existing, error } = await supabase
    .from('customer_subscriptions')
    .select('id')
    .eq('customer_id', customer.id)
    .order('activation_date', { ascending: false })
    .limit(1);

  assertNoSupabaseError(error, 'Unable to load the primary subscription');

  if (!existing || existing.length === 0) {
    await createSubscriptionsForCustomer(customer.id, customer);
    return;
  }

  const primaryService = buildServicePayloads(customer)[0];
  const plan = await resolveSubscriptionPlan(primaryService);
  const { error: updateError } = await supabase
    .from('customer_subscriptions')
    .update(buildSubscriptionRow(customer.id, primaryService, plan.id))
    .eq('id', existing[0].id);

  assertNoSupabaseError(updateError, 'Unable to update primary customer subscription');
};

const syncCustomerSnapshotFromService = async (customerId, service) => {
  const supabase = getSupabaseServiceClient();
  const durationMonths = Number(service.durationMonths || service.duration || 12);
  const { error } = await supabase
    .from('customers')
    .update({
      service_id: service.serviceCode || service.planCode || null,
      transaction_id: service.transactionId || null,
      start_date: service.startDate || service.activationDate || null,
      payment_date: service.paymentDate || service.startDate || service.activationDate || null,
      payment_mode: normalizePaymentMode(service.paymentMode),
      amount: parseNumeric(service.amount),
      expiry_date: service.expiryDate || null,
      service_duration: Number.isFinite(durationMonths) ? durationMonths : null,
      box: service.box || service.deviceBox || null,
      mac: service.mac || service.deviceMac || null
    })
    .eq('id', customerId);

  assertNoSupabaseError(error, 'Unable to sync customer summary from service');
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// PostgREST treats , . : ( ) as syntax inside an `or` filter, so a search for
// "a,b" would be parsed as two conditions. Strip them rather than escaping:
// none of them are meaningful in a name, an email or a device identifier.
const sanitizeSearchTerm = (term) =>
  String(term || '')
    .replace(/[,().:*%\\]/g, ' ')
    .trim()
    .slice(0, 120);

const SEARCHABLE_COLUMNS = [
  'name',
  'email',
  'phone',
  'whatsapp_number',
  'customer_code',
  'service_id',
  'transaction_id',
  'mac',
  'box',
  'city'
];

const SORTABLE_COLUMNS = new Set([
  'created_at',
  'name',
  'email',
  'status',
  'expiry_date',
  'amount'
]);

// The previous implementation fetched every customer and then issued two more
// queries per customer -- 1 + 2N round trips -- while the frontend did all
// filtering, sorting and pagination in the browser. Every screen therefore
// downloaded the entire book of business. This is two queries for a page:
// one for the rows with their subscriptions embedded, one for the financials
// of just those rows.
const list = async ({
  search = '',
  status = '',
  page = 1,
  pageSize = 25,
  sortBy = 'created_at',
  sortDirection = 'desc',
  expiringWithinDays = null,
  deleted = false
} = {}) => {
  const supabase = getSupabaseServiceClient();
  const safePageSize = Math.min(Math.max(Number(pageSize) || 25, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safePageSize;
  const column = SORTABLE_COLUMNS.has(sortBy) ? sortBy : 'created_at';

  let query = supabase
    .from('customers')
    .select(`*, customer_subscriptions (${SUBSCRIPTION_SELECT})`, { count: 'exact' });

  query = deleted ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);

  const term = sanitizeSearchTerm(search);

  if (term) {
    query = query.or(SEARCHABLE_COLUMNS.map((field) => `${field}.ilike.%${term}%`).join(','));
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (Number.isInteger(Number(expiringWithinDays))) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + Number(expiringWithinDays));
    query = query.lte('expiry_date', horizon.toISOString().slice(0, 10));
  }

  const { data, error, count } = await query
    .order(column, { ascending: String(sortDirection).toLowerCase() === 'asc' })
    .range(from, from + safePageSize - 1);

  assertNoSupabaseError(error, 'Unable to fetch customers');

  const rows = data || [];
  const financials = await getFinancialsFor(rows.map((row) => row.id));

  return {
    customers: rows.map((row) =>
      mapRowToCustomer(
        row,
        (row.customer_subscriptions || []).map(mapRowToSubscription).filter(Boolean),
        [],
        financials.get(row.id)
      )
    ),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: count ?? rows.length,
      totalPages: Math.max(Math.ceil((count ?? rows.length) / safePageSize), 1)
    }
  };
};

// Kept for callers that genuinely need every record -- the CSV export and the
// scheduler. Pages through `list` rather than reintroducing an unbounded query.
const getAll = async (filters = {}) => {
  const collected = [];
  let page = 1;

  for (;;) {
    const { customers, pagination } = await list({ ...filters, page, pageSize: 200 });
    collected.push(...customers);

    if (page >= pagination.totalPages || customers.length === 0) {
      break;
    }

    page += 1;
  }

  return collected;
};

const fetchCustomerRow = async (id, { includeDeleted = false } = {}) => {
  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from('customers')
    .select(
      `*, customer_subscriptions (${SUBSCRIPTION_SELECT}), payments (${PAYMENT_SELECT})`
    )
    .eq('id', id);

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query.maybeSingle();
  assertNoSupabaseError(error, 'Unable to fetch customer');
  return data;
};

const hydrateCustomer = async (row) => {
  if (!row) {
    return null;
  }

  const financials = await getFinancialsFor([row.id]);
  const subscriptions = (row.customer_subscriptions || [])
    .map(mapRowToSubscription)
    .filter(Boolean)
    .sort((left, right) => String(right.activationDate).localeCompare(String(left.activationDate)));
  const payments = (row.payments || [])
    .map(mapRowToPayment)
    .filter(Boolean)
    .sort((left, right) => String(right.paymentDate).localeCompare(String(left.paymentDate)));

  return mapRowToCustomer(row, subscriptions, payments, financials.get(row.id));
};

const getById = async (id) => hydrateCustomer(await fetchCustomerRow(id));

const findByEmail = async (email) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, email')
    .eq('email', String(email).trim().toLowerCase())
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to find customer by email');
  return data ? { id: data.id, email: data.email } : null;
};

const findByPhone = async (phone) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, phone')
    .eq('phone', normalizePhoneNumber(phone))
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to find customer by phone');
  return data ? { id: data.id, phone: data.phone } : null;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

const create = async (payload) => {
  const supabase = getSupabaseServiceClient();
  const temporaryPortalPassword = payload.portalPassword || generatePortalPassword();
  const preparedPayload = {
    ...payload,
    customerCode:
      payload.customerCode || (await createUniqueReference('customer_code', generateCustomerCode)),
    serviceId: payload.serviceId || (await createUniqueReference('service_id', generateServiceId)),
    transactionId:
      payload.transactionId ||
      (await createUniqueReference('transaction_id', generateTransactionId)),
    phone: normalizePhoneNumber(payload.phone),
    whatsappNumber: normalizePhoneNumber(payload.whatsappNumber || payload.phone || null),
    portalAccessEnabled:
      typeof payload.portalAccessEnabled === 'boolean' ? payload.portalAccessEnabled : true,
    portalResetRequired:
      typeof payload.portalResetRequired === 'boolean' ? payload.portalResetRequired : true
  };

  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...mapPayloadToRow(preparedPayload),
      portal_password_hash: await bcrypt.hash(temporaryPortalPassword, 12),
      portal_access_enabled: preparedPayload.portalAccessEnabled,
      portal_reset_required: preparedPayload.portalResetRequired,
      portal_password_expires_at: new Date(
        Date.now() + portalPasswordTtlHours * 60 * 60 * 1000
      ).toISOString()
    })
    .select('id')
    .single();

  try {
    assertNoSupabaseError(error, 'Unable to create customer');
    await createSubscriptionsForCustomer(data.id, preparedPayload);
    const customer = await getById(data.id);

    return {
      ...customer,
      portalSetup: {
        temporaryPassword: temporaryPortalPassword,
        resetRequired: true,
        expiresInHours: portalPasswordTtlHours
      }
    };
  } catch (creationError) {
    // The customer row landed but its subscriptions did not. Roll it back so a
    // half-created account does not sit in the directory. A hard delete is
    // correct here specifically because nothing can have been billed yet.
    if (data?.id) {
      const { error: rollbackError } = await supabase.from('customers').delete().eq('id', data.id);

      if (rollbackError) {
        logger.error('Failed to roll back a partially created customer', {
          customerId: data.id,
          error: rollbackError
        });
      }
    }

    throw creationError;
  }
};

const update = async (id, updates) => {
  const supabase = getSupabaseServiceClient();
  const row = mapPayloadToRow(updates);

  if (Object.keys(row).length === 0) {
    return getById(id);
  }

  const { data, error } = await supabase
    .from('customers')
    .update(row)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to update customer');

  if (!data) {
    return null;
  }

  // Only rebuild the primary subscription when the edit actually touched a
  // field the subscription mirrors. This used to run on every update, so
  // correcting a customer's address rewrote their billing amount and
  // recomputed their expiry date from a service_duration that defaulted to 12.
  if (touchesSubscription(updates)) {
    await syncPrimarySubscription(mapRowToCustomer(data, []));
  }

  return getById(id);
};

// Soft delete. The previous hard delete cascaded through payments, so removing
// a customer destroyed the record of money they had paid -- irreversibly, and
// including figures that had already been reported on.
const remove = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .update({
      deleted_at: new Date().toISOString(),
      portal_access_enabled: false
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to delete customer');
  return Boolean(data);
};

const restore = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .update({ deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .select('id')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to restore customer');
  return Boolean(data);
};

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

const getPortalCustomerById = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select(`*, customer_subscriptions (${SUBSCRIPTION_SELECT}), payments (${PAYMENT_SELECT})`)
    .eq('id', id)
    .eq('portal_access_enabled', true)
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch portal customer');
  return hydrateCustomer(data);
};

const getPortalAuthRow = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, token_version, portal_access_enabled, deleted_at')
    .eq('id', id)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch portal customer credentials');
  return data;
};

const authenticatePortalCustomer = async (email, password) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, portal_password_hash, portal_password_expires_at, portal_reset_required')
    .eq('email', String(email).trim().toLowerCase())
    .eq('portal_access_enabled', true)
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch customer portal account');

  if (!data?.portal_password_hash) {
    // Hash anyway so a missing account and a wrong password take the same time
    // and cannot be told apart by timing the response.
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    return null;
  }

  const isMatch = await bcrypt.compare(password, data.portal_password_hash);

  if (!isMatch) {
    return null;
  }

  // A temporary password that was issued and never used stops being a standing
  // credential. An expiry only applies while a reset is still outstanding --
  // once the customer chooses their own password it is cleared.
  if (
    data.portal_reset_required &&
    data.portal_password_expires_at &&
    new Date(data.portal_password_expires_at).getTime() < Date.now()
  ) {
    return { expired: true };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('customers')
    .update({ portal_last_login: now })
    .eq('id', data.id);

  assertNoSupabaseError(updateError, 'Unable to update customer portal last login');
  return getPortalCustomerById(data.id);
};

const changePortalPassword = async (customerId, currentPassword, newPassword) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, portal_password_hash, token_version')
    .eq('id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch customer for password change');

  if (!data?.portal_password_hash) {
    return { success: false, code: 'not_found' };
  }

  const isMatch = await bcrypt.compare(currentPassword, data.portal_password_hash);

  if (!isMatch) {
    return { success: false, code: 'invalid_password' };
  }

  const { error: updateError } = await supabase
    .from('customers')
    .update({
      portal_password_hash: await bcrypt.hash(newPassword, 12),
      portal_reset_required: false,
      portal_password_expires_at: null,
      // Every session opened with the old password stops working. A password
      // change that leaves old tokens valid is not a password change.
      token_version: Number(data.token_version || 0) + 1
    })
    .eq('id', customerId);

  assertNoSupabaseError(updateError, 'Unable to update customer portal password');
  return { success: true, tokenVersion: Number(data.token_version || 0) + 1 };
};

const resetPortalPassword = async (customerId) => {
  const supabase = getSupabaseServiceClient();
  const temporaryPassword = generatePortalPassword();
  const { data: current, error: currentError } = await supabase
    .from('customers')
    .select('token_version')
    .eq('id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(currentError, 'Unable to read customer before password reset');

  if (!current) {
    return null;
  }

  const expiresAt = new Date(Date.now() + portalPasswordTtlHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('customers')
    .update({
      portal_password_hash: await bcrypt.hash(temporaryPassword, 12),
      portal_access_enabled: true,
      portal_reset_required: true,
      portal_password_expires_at: expiresAt,
      token_version: Number(current.token_version || 0) + 1
    })
    .eq('id', customerId)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to reset portal password');

  if (!data) {
    return null;
  }

  return {
    customer: mapRowToCustomer(data, []),
    temporaryPassword,
    expiresAt,
    expiresInHours: portalPasswordTtlHours
  };
};

const setPortalAccess = async (customerId, enabled) => {
  const supabase = getSupabaseServiceClient();
  const { data: current, error: currentError } = await supabase
    .from('customers')
    .select('token_version')
    .eq('id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  assertNoSupabaseError(currentError, 'Unable to read customer before changing portal access');

  if (!current) {
    return null;
  }

  const { data, error } = await supabase
    .from('customers')
    .update({
      portal_access_enabled: Boolean(enabled),
      // Revoking access has to invalidate the session that is already open,
      // not just prevent the next sign-in.
      token_version: enabled ? current.token_version : Number(current.token_version || 0) + 1
    })
    .eq('id', customerId)
    .select('id')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to change portal access');
  return Boolean(data);
};

// ---------------------------------------------------------------------------
// Services and payments
// ---------------------------------------------------------------------------

const addServiceSubscription = async (customerId, service) => {
  await saveServiceSubscription(customerId, service);
  return getById(customerId);
};

const updateServiceSubscription = async (customerId, subscriptionId, service) => {
  const supabase = getSupabaseServiceClient();
  const { data: existingSubscription, error: existingSubscriptionError } = await supabase
    .from('customer_subscriptions')
    .select('service_code')
    .eq('id', subscriptionId)
    .eq('customer_id', customerId)
    .maybeSingle();

  assertNoSupabaseError(existingSubscriptionError, 'Unable to fetch existing customer service');

  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from('customers')
    .select('service_id')
    .eq('id', customerId)
    .maybeSingle();

  assertNoSupabaseError(existingCustomerError, 'Unable to fetch existing customer summary');

  await saveServiceSubscription(customerId, service, subscriptionId);

  if (
    existingCustomer?.service_id &&
    existingSubscription?.service_code &&
    existingCustomer.service_id === existingSubscription.service_code
  ) {
    await syncCustomerSnapshotFromService(customerId, service);
  }

  return getById(customerId);
};

const removeServiceSubscription = async (customerId, subscriptionId) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customer_subscriptions')
    .update({ status: 'cancelled', auto_renew: false })
    .eq('id', subscriptionId)
    .eq('customer_id', customerId)
    .select('id')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to cancel customer service');
  return Boolean(data);
};

// The whole of this used to be five-plus sequential writes with no
// transaction: it extended each subscription's expiry date, THEN inserted the
// payment rows, THEN updated the customer. A failure in between renewed a
// service without recording that anyone paid for it. It is now one call to a
// Postgres function, which runs in a single transaction and either does all of
// it or none of it.
const recordCustomerPayment = async (customerId, payload) => {
  const supabase = getSupabaseServiceClient();
  const subscriptionIds = Array.isArray(payload.subscriptionIds)
    ? payload.subscriptionIds.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (subscriptionIds.length === 0) {
    throw new Error('Choose at least one service for this payment.');
  }

  const paymentDateValue = payload.paymentDate || new Date().toISOString();
  const paymentDate = new Date(paymentDateValue);

  if (Number.isNaN(paymentDate.getTime())) {
    throw new Error('Payment date is invalid.');
  }

  let amount = parseNumeric(payload.amount);

  // No amount supplied means "settle everything selected", which is what the
  // record-payment dialog defaults to. Work out what is actually outstanding
  // rather than charging the full price of an already part-paid cycle again.
  if (amount <= 0) {
    const { data: selected, error: selectedError } = await supabase
      .from('customer_subscriptions')
      .select('amount, discount, cycle_paid_amount')
      .eq('customer_id', customerId)
      .in('id', subscriptionIds);

    assertNoSupabaseError(selectedError, 'Unable to total the selected services');

    amount = (selected || []).reduce((sum, subscription) => {
      const net = Math.max(parseNumeric(subscription.amount) - parseNumeric(subscription.discount), 0);
      return sum + Math.max(net - parseNumeric(subscription.cycle_paid_amount), 0);
    }, 0);
  }

  if (amount <= 0) {
    throw new Error('There is nothing outstanding on the selected services.');
  }

  const { error } = await supabase.rpc('record_customer_payment', {
    p_customer_id: customerId,
    p_subscription_ids: subscriptionIds,
    p_amount: amount,
    p_payment_mode: normalizePaymentMode(payload.paymentMode),
    p_transaction_id: String(payload.transactionId || generateTransactionId()).trim(),
    p_payment_date: paymentDate.toISOString(),
    p_discount: parseNumeric(payload.discount),
    p_tax: parseNumeric(payload.tax),
    p_currency: String(payload.currency || defaultCurrency).toUpperCase(),
    p_notes: payload.notes || null,
    p_apply_credit: payload.applyCredit !== false
  });

  assertNoSupabaseError(error, 'Unable to record the payment');
  return getById(customerId);
};

const refundPayment = async (customerId, paymentId, reason = '') => {
  const supabase = getSupabaseServiceClient();
  const { data: payment, error: lookupError } = await supabase
    .from('payments')
    .select('id, customer_id, status')
    .eq('id', paymentId)
    .eq('customer_id', customerId)
    .maybeSingle();

  assertNoSupabaseError(lookupError, 'Unable to load the payment');

  if (!payment) {
    return null;
  }

  if (payment.status !== 'paid') {
    throw new Error('Only a payment currently marked paid can be refunded.');
  }

  const { error } = await supabase.rpc('refund_customer_payment', {
    p_payment_id: paymentId,
    p_reason: reason || null
  });

  assertNoSupabaseError(error, 'Unable to refund the payment');
  return getById(customerId);
};

// ---------------------------------------------------------------------------
// Scheduler support
// ---------------------------------------------------------------------------

const expireLapsedSubscriptions = async () => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc('expire_lapsed_subscriptions');

  assertNoSupabaseError(error, 'Unable to expire lapsed subscriptions');
  return Number(data || 0);
};

// Subscriptions expiring exactly `days` from now, skipping anyone who has
// already been told about this expiry date and anyone who opted out of every
// channel being used.
const getSubscriptionsExpiringIn = async (days, { channels = ['email'], limit = 500 } = {}) => {
  const supabase = getSupabaseServiceClient();
  const target = new Date();
  target.setDate(target.getDate() + Number(days));
  const targetDate = target.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('renewal_overview')
    .select('*')
    .eq('expiry_date', targetDate)
    .eq('status', 'active')
    .limit(limit);

  assertNoSupabaseError(error, 'Unable to fetch expiring subscriptions');

  const rows = (data || []).filter((row) =>
    channels.some((channel) =>
      channel === 'email' ? row.email_opt_in !== false : row.whatsapp_opt_in !== false
    )
  );

  if (rows.length === 0) {
    return [];
  }

  const kind = `expiring_${days}_days`;
  const { data: alreadySent, error: sentError } = await supabase
    .from('subscription_reminders')
    .select('subscription_id')
    .eq('reminder_kind', kind)
    .eq('expiry_date', targetDate)
    .in('subscription_id', rows.map((row) => row.subscription_id));

  assertNoSupabaseError(sentError, 'Unable to check which reminders were already sent');

  const sent = new Set((alreadySent || []).map((row) => row.subscription_id));
  return rows.filter((row) => !sent.has(row.subscription_id));
};

const markReminderSent = async ({ subscriptionId, customerId, kind, expiryDate, channels }) => {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('subscription_reminders').insert({
    subscription_id: subscriptionId,
    customer_id: customerId,
    reminder_kind: kind,
    expiry_date: expiryDate,
    channels
  });

  // A unique violation means a concurrent run already claimed this reminder.
  // That is the constraint doing its job, not a failure.
  if (error && error.code !== '23505') {
    assertNoSupabaseError(error, 'Unable to record that a reminder was sent');
  }

  return !error;
};

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

const sampleCustomers = () => [
  {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+12025550143',
    address: '123 Main St, New York, NY',
    status: 'active',
    role: 'Premium Customer',
    mac: 'AA:BB:CC:DD:EE:FF',
    box: 'BOX001',
    startDate: '2026-01-15',
    paymentDate: '2026-01-15',
    paymentMode: 'Credit Card',
    amount: '99.99',
    expiryDate: '2026-12-15',
    note: 'VIP Customer',
    serviceDuration: '12'
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+12025550144',
    address: '456 Oak Ave, Los Angeles, CA',
    status: 'inactive',
    role: 'Standard Customer',
    mac: 'BB:CC:DD:EE:FF:AA',
    box: 'BOX002',
    startDate: '2026-02-01',
    paymentDate: '2026-02-01',
    paymentMode: 'PayPal',
    amount: '79.99',
    expiryDate: '2026-11-01',
    note: 'Regular Customer',
    serviceDuration: '12'
  },
  {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '+12025550145',
    address: '789 Pine St, Chicago, IL',
    status: 'active',
    role: 'Basic Customer',
    mac: 'CC:DD:EE:FF:AA:BB',
    box: 'BOX003',
    startDate: '2026-03-01',
    paymentDate: '2026-03-01',
    paymentMode: 'Bank Transfer',
    amount: '129.99',
    expiryDate: '2027-02-01',
    note: 'Premium Customer',
    serviceDuration: '12'
  }
];

const ensureSampleCustomers = async () => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from('customers').select('id').limit(1);

  assertNoSupabaseError(error, 'Unable to check existing customers');

  if (Array.isArray(data) && data.length > 0) {
    return (await list({ pageSize: 200 })).customers;
  }

  for (const customer of sampleCustomers()) {
    await create(customer);
  }

  return (await list({ pageSize: 200 })).customers;
};

module.exports = {
  ensureSampleCustomers,
  list,
  getAll,
  getById,
  getPortalCustomerById,
  getPortalAuthRow,
  authenticatePortalCustomer,
  changePortalPassword,
  resetPortalPassword,
  setPortalAccess,
  addServiceSubscription,
  updateServiceSubscription,
  removeServiceSubscription,
  recordCustomerPayment,
  refundPayment,
  expireLapsedSubscriptions,
  getSubscriptionsExpiringIn,
  markReminderSent,
  findByEmail,
  findByPhone,
  create,
  update,
  remove,
  restore
};
