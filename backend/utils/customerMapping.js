// Pure value mapping and date arithmetic, split out of customerRepository so
// it can be unit tested without a database. Nothing here touches Supabase.

const paymentModeToDb = {
  Cash: 'cash',
  'Credit Card': 'credit_card',
  'Debit Card': 'debit_card',
  'Bank Transfer': 'bank_transfer',
  PayPal: 'paypal',
  Other: 'other'
};

const paymentModeFromDb = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal',
  other: 'Other'
};

const normalizePaymentMode = (value) => {
  if (!value) {
    return 'other';
  }

  const directMatch = paymentModeToDb[value];

  if (directMatch) {
    return directMatch;
  }

  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  return paymentModeFromDb[normalized] ? normalized : 'other';
};

const SUBSCRIPTION_STATUSES = ['active', 'expired', 'cancelled', 'suspended', 'draft'];

const mapSubscriptionStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return SUBSCRIPTION_STATUSES.includes(normalized) ? normalized : 'active';
};

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
};

const normalizePhoneNumber = (value) => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();
  const sanitized = rawValue.startsWith('+')
    ? `+${rawValue.slice(1).replace(/\D/g, '')}`
    : rawValue.replace(/\D/g, '');

  return sanitized || null;
};

// Calendar months, clamped to the end of the target month.
//
// Date.setMonth rolls over: 31 January plus one month lands on 3 March,
// because 31 February does not exist. For a subscription that means a customer
// billed on the 31st drifts forward every renewal. Clamping to the 28th/30th
// keeps the billing day stable.
const addMonths = (value, months) => {
  const baseDate = new Date(value || new Date().toISOString().slice(0, 10));

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const safeMonths = Math.max(Number(months) || 12, 1);
  const dayOfMonth = baseDate.getUTCDate();
  const target = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + safeMonths, 1)
  );
  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  target.setUTCDate(Math.min(dayOfMonth, daysInTargetMonth));
  return target.toISOString().slice(0, 10);
};

const buildExpiryDate = (startDate, explicitExpiryDate, durationMonths) => {
  if (explicitExpiryDate) {
    return formatDate(explicitExpiryDate);
  }

  const baseDateValue = startDate || new Date().toISOString().slice(0, 10);
  return addMonths(baseDateValue, durationMonths);
};

module.exports = {
  paymentModeFromDb,
  normalizePaymentMode,
  mapSubscriptionStatus,
  parseNumeric,
  formatAmount,
  formatDate,
  normalizePhoneNumber,
  addMonths,
  buildExpiryDate
};
