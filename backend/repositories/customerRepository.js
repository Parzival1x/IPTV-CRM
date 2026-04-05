const bcrypt = require('bcryptjs');
const { getSupabaseServiceClient } = require('../config/supabase');
const {
  generateCustomerCode,
  generateServiceId,
  generateTransactionId,
  generatePortalPassword
} = require('../utils/ids');

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

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
};

const formatAmount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
};

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePhoneNumber = (value) => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();
  const sanitized = rawValue.startsWith('+')
    ? `+${rawValue.slice(1).replace(/\D/g, '')}`
    : rawValue.replace(/\D/g, '');

  if (!sanitized) {
    return null;
  }

  return sanitized;
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

const mapSubscriptionStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (['active', 'expired', 'cancelled', 'suspended', 'draft'].includes(normalized)) {
    return normalized;
  }

  return 'active';
};

const getDurationDays = (durationMonths) => {
  const parsedMonths = Number(durationMonths);
  const safeMonths = Number.isFinite(parsedMonths) && parsedMonths > 0 ? parsedMonths : 12;
  return safeMonths * 30;
};

const buildExpiryDate = (startDate, explicitExpiryDate, durationMonths) => {
  if (explicitExpiryDate) {
    return explicitExpiryDate;
  }

  const baseDateValue = startDate || new Date().toISOString().slice(0, 10);
  const baseDate = new Date(baseDateValue);

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  baseDate.setMonth(baseDate.getMonth() + Math.max(Number(durationMonths) || 12, 1));
  return baseDate.toISOString().slice(0, 10);
};

const addDays = (value, days) => {
  const baseDate = new Date(value || new Date().toISOString().slice(0, 10));

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  baseDate.setDate(baseDate.getDate() + Math.max(Number(days) || 30, 1));
  return baseDate.toISOString().slice(0, 10);
};

const mapRowToSubscription = (row) => {
  if (!row) {
    return null;
  }

  const plan = Array.isArray(row.subscription_plans)
    ? row.subscription_plans[0]
    : row.subscription_plans || null;
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};

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
    paymentMode: paymentModeFromDb[row.payment_mode] || 'Other',
    transactionId: row.transaction_id || '',
    serviceCode: row.service_code || '',
    serviceLabel: row.service_label || plan?.name || '',
    deviceBox: row.device_box || '',
    deviceMac: row.device_mac || '',
    portalUrl: row.portal_url || '',
    billingUrl: row.billing_url || '',
    maxConnections: Number(plan?.max_connections || metadata.maxConnections || 1),
    features: Array.isArray(metadata.features) ? metadata.features : [],
    category: metadata.category || '',
    sku: metadata.sku || '',
    metadata
  };
};

const mapRowToPayment = (row) => {
  if (!row) {
    return null;
  }

  const subscription = Array.isArray(row.customer_subscriptions)
    ? row.customer_subscriptions[0]
    : row.customer_subscriptions || null;
  const plan = Array.isArray(subscription?.subscription_plans)
    ? subscription.subscription_plans[0]
    : subscription?.subscription_plans || null;

  return {
    id: row.id,
    subscriptionId: row.subscription_id || null,
    serviceLabel:
      subscription?.service_label ||
      plan?.name ||
      (row.subscription_id ? 'Service payment' : 'Account credit top-up'),
    amount: formatAmount(row.amount),
    finalAmount: formatAmount(row.final_amount),
    discount: formatAmount(row.discount),
    tax: formatAmount(row.tax),
    paymentMode: paymentModeFromDb[row.payment_mode] || 'Other',
    status: row.status || 'paid',
    transactionId: row.transaction_id || '',
    paymentDate: row.payment_date || '',
    nextDueDate: formatDate(row.next_due_date)
  };
};

const summarizeFinancials = (subscriptions = [], payments = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const billableStatuses = new Set(['active', 'expired', 'suspended']);
  const recurringAmount = subscriptions
    .filter((subscription) => billableStatuses.has(subscription.status))
    .reduce((sum, subscription) => sum + parseNumeric(subscription.amount), 0);

  let dueNow = 0;
  let overdueAmount = 0;
  let dueSoonServiceCount = 0;
  let overdueServiceCount = 0;

  for (const subscription of subscriptions) {
    if (!billableStatuses.has(subscription.status)) {
      continue;
    }

    const amount = parseNumeric(subscription.amount);
    const expiry = new Date(subscription.expiryDate);
    const isInvalidExpiry = Number.isNaN(expiry.getTime());

    if (subscription.status === 'expired' || subscription.status === 'suspended') {
      dueNow += amount;
      overdueAmount += amount;
      overdueServiceCount += 1;
      continue;
    }

    if (isInvalidExpiry) {
      continue;
    }

    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      dueNow += amount;
      overdueAmount += amount;
      overdueServiceCount += 1;
    } else if (diffDays <= 7) {
      dueNow += amount;
      dueSoonServiceCount += 1;
    }
  }

  const totalPaid = payments.reduce((sum, payment) => {
    const paymentAmount = parseNumeric(payment.finalAmount);

    if (payment.status === 'refunded') {
      return sum - paymentAmount;
    }

    if (payment.status === 'paid') {
      return sum + paymentAmount;
    }

    return sum;
  }, 0);

  const availableCredit = Math.max(totalPaid - recurringAmount, 0);
  const outstandingBalance = Math.max(dueNow - availableCredit, 0);

  return {
    recurringAmount: formatAmount(recurringAmount),
    dueNow: formatAmount(dueNow),
    overdueAmount: formatAmount(overdueAmount),
    totalPaid: formatAmount(totalPaid),
    availableCredit: formatAmount(availableCredit),
    outstandingBalance: formatAmount(outstandingBalance),
    dueSoonServiceCount,
    overdueServiceCount
  };
};

const mapRowToCustomer = (row, subscriptions = [], payments = []) => {
  if (!row) {
    return null;
  }

  const derivedPaymentSummary = summarizeFinancials(subscriptions, payments);
  const hasRecordedPayments = payments.length > 0;
  const paymentSummary = {
    ...derivedPaymentSummary,
    totalPaid: hasRecordedPayments ? derivedPaymentSummary.totalPaid : formatAmount(row.total_credit),
    availableCredit: hasRecordedPayments
      ? derivedPaymentSummary.availableCredit
      : formatAmount(row.remaining_credits)
  };

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
    expiryDate: formatDate(row.expiry_date),
    totalCredit: paymentSummary.totalPaid,
    alreadyGiven: hasRecordedPayments
      ? paymentSummary.recurringAmount
      : formatAmount(row.already_given),
    remainingCredits: paymentSummary.availableCredit,
    note: row.notes || '',
    serviceDuration: row.service_duration ? String(row.service_duration) : '',
    portalAccessEnabled: row.portal_access_enabled !== false,
    portalResetRequired: row.portal_reset_required !== false,
    portalLastLogin: row.portal_last_login || null,
    subscriptions,
    payments,
    paymentSummary
  };
};

const mapPayloadToRow = (payload) => {
  const row = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    row.name = String(payload.name).trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'customerCode')) {
    row.customer_code = payload.customerCode || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'serviceId')) {
    row.service_id = payload.serviceId || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'transactionId')) {
    row.transaction_id = payload.transactionId || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    row.email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    row.phone = normalizePhoneNumber(payload.phone);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'whatsappNumber')) {
    row.whatsapp_number = normalizePhoneNumber(payload.whatsappNumber);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'address')) {
    row.address = payload.address || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'city')) {
    row.city = payload.city || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'country')) {
    row.country = payload.country || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    row.status = payload.status || 'pending';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    row.avatar = payload.avatar || '/images/user/user-02.png';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
    row.role = payload.role || 'customer';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'mac')) {
    row.mac = payload.mac || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'box')) {
    row.box = payload.box || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'startDate')) {
    row.start_date = payload.startDate || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'paymentDate')) {
    row.payment_date = payload.paymentDate || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'paymentMode')) {
    row.payment_mode = normalizePaymentMode(payload.paymentMode);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'amount')) {
    row.amount = parseNumeric(payload.amount);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'expiryDate')) {
    row.expiry_date = payload.expiryDate || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'totalCredit')) {
    row.total_credit = parseNumeric(payload.totalCredit);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'alreadyGiven')) {
    row.already_given = parseNumeric(payload.alreadyGiven);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'remainingCredits')) {
    row.remaining_credits = parseNumeric(payload.remainingCredits);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'note')) {
    row.notes = payload.note || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'serviceDuration')) {
    row.service_duration = payload.serviceDuration ? Number(payload.serviceDuration) : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'portalAccessEnabled')) {
    row.portal_access_enabled = Boolean(payload.portalAccessEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'portalResetRequired')) {
    row.portal_reset_required = Boolean(payload.portalResetRequired);
  }

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

const getSubscriptionsByCustomerId = async (customerId) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customer_subscriptions')
    .select(`
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
        max_connections,
        description
      )
    `)
    .eq('customer_id', customerId)
    .order('activation_date', { ascending: false });

  assertNoSupabaseError(error, 'Unable to fetch customer subscriptions');
  return (data || []).map(mapRowToSubscription).filter(Boolean);
};

const getPaymentsByCustomerId = async (customerId) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('payments')
    .select(`
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
      customer_subscriptions (
        service_label,
        subscription_plans (
          name
        )
      )
    `)
    .eq('customer_id', customerId)
    .order('payment_date', { ascending: false });

  assertNoSupabaseError(error, 'Unable to fetch customer payments');
  return (data || []).map(mapRowToPayment).filter(Boolean);
};

const persistFinancialSnapshot = async (customerId, subscriptions = null, payments = null) => {
  const supabase = getSupabaseServiceClient();
  const resolvedSubscriptions = subscriptions || (await getSubscriptionsByCustomerId(customerId));
  const resolvedPayments = payments || (await getPaymentsByCustomerId(customerId));
  const summary = summarizeFinancials(resolvedSubscriptions, resolvedPayments);

  const { error } = await supabase
    .from('customers')
    .update({
      total_credit: parseNumeric(summary.totalPaid),
      already_given: parseNumeric(summary.recurringAmount),
      remaining_credits: parseNumeric(summary.availableCredit)
    })
    .eq('id', customerId);

  assertNoSupabaseError(error, 'Unable to persist customer financial summary');
  return summary;
};

const mapPayloadToService = (service, fallbackPayload) => {
  const activationDate =
    service.startDate ||
    service.activationDate ||
    fallbackPayload.startDate ||
    fallbackPayload.paymentDate ||
    new Date().toISOString().slice(0, 10);
  const durationMonths = Number(
    service.durationMonths || service.duration || fallbackPayload.serviceDuration || 12
  );

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
    paymentMode: normalizePaymentMode(service.paymentMode || fallbackPayload.paymentMode),
    activationDate,
    expiryDate: buildExpiryDate(
      activationDate,
      service.expiryDate || fallbackPayload.expiryDate,
      durationMonths
    ),
    durationDays: getDurationDays(durationMonths),
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
      maxConnections: Number(service.maxConnections) > 0 ? Number(service.maxConnections) : 1
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

const ensureSubscriptionPlan = async (service) => {
  const supabase = getSupabaseServiceClient();
  const row = {
    plan_code: service.planCode || null,
    name: service.name || 'Primary IPTV Service',
    price: service.amount,
    duration_days: service.durationDays,
    max_connections: service.maxConnections,
    description: service.description || null,
    is_active: true
  };

  if (row.plan_code) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .upsert(row, { onConflict: 'plan_code' })
      .select('*')
      .single();

    assertNoSupabaseError(error, 'Unable to save subscription plan');
    return data;
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(row)
    .select('*')
    .single();

  assertNoSupabaseError(error, 'Unable to create subscription plan');
  return data;
};

const createSubscriptionsForCustomer = async (customerId, payload) => {
  const supabase = getSupabaseServiceClient();
  const services = buildServicePayloads(payload);
  const rows = [];

  for (const service of services) {
    const plan = await ensureSubscriptionPlan(service);

    rows.push({
      customer_id: customerId,
      plan_id: plan.id,
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
      device_box: service.deviceBox,
      device_mac: service.deviceMac,
      portal_url: service.portalUrl,
      billing_url: service.billingUrl,
      metadata: service.metadata
    });
  }

  const { error } = await supabase.from('customer_subscriptions').insert(rows);
  assertNoSupabaseError(error, 'Unable to create customer subscriptions');
};

const saveServiceSubscription = async (customerId, service, existingSubscriptionId = null) => {
  const supabase = getSupabaseServiceClient();
  const normalizedService = mapPayloadToService(service, service);
  const plan = await ensureSubscriptionPlan(normalizedService);
  const row = {
    customer_id: customerId,
    plan_id: plan.id,
    activation_date: normalizedService.activationDate,
    expiry_date: normalizedService.expiryDate,
    status: normalizedService.status,
    discount: normalizedService.discount,
    auto_renew: normalizedService.autoRenew,
    service_label: normalizedService.serviceLabel || normalizedService.name,
    service_code: normalizedService.serviceCode || normalizedService.planCode || null,
    transaction_id: normalizedService.transactionId,
    payment_mode: normalizedService.paymentMode,
    amount: normalizedService.amount,
    device_box: normalizedService.deviceBox,
    device_mac: normalizedService.deviceMac,
    portal_url: normalizedService.portalUrl,
    billing_url: normalizedService.billingUrl,
    metadata: normalizedService.metadata
  };

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

const syncPrimarySubscription = async (customer) => {
  const supabase = getSupabaseServiceClient();
  const subscriptions = await getSubscriptionsByCustomerId(customer.id);

  if (subscriptions.length === 0) {
    await createSubscriptionsForCustomer(customer.id, customer);
    return;
  }

  const primaryService = buildServicePayloads(customer)[0];
  const plan = await ensureSubscriptionPlan(primaryService);

  const { error } = await supabase
    .from('customer_subscriptions')
    .update({
      plan_id: plan.id,
      activation_date: primaryService.activationDate,
      expiry_date: primaryService.expiryDate,
      status: primaryService.status,
      discount: primaryService.discount,
      auto_renew: primaryService.autoRenew,
      service_label: primaryService.serviceLabel || primaryService.name,
      service_code: primaryService.serviceCode || primaryService.planCode || null,
      transaction_id: primaryService.transactionId,
      payment_mode: primaryService.paymentMode,
      amount: primaryService.amount,
      device_box: primaryService.deviceBox,
      device_mac: primaryService.deviceMac,
      portal_url: primaryService.portalUrl,
      billing_url: primaryService.billingUrl,
      metadata: primaryService.metadata
    })
    .eq('id', subscriptions[0].id);

  assertNoSupabaseError(error, 'Unable to update primary customer subscription');
};

const sampleCustomers = () => [
  {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St, New York, NY',
    status: 'active',
    avatar: '/images/user/user-02.png',
    role: 'Premium Customer',
    mac: 'AA:BB:CC:DD:EE:FF',
    box: 'BOX001',
    startDate: '2024-01-15',
    paymentDate: '2024-01-15',
    paymentMode: 'Credit Card',
    amount: '99.99',
    expiryDate: '2024-12-15',
    totalCredit: '500.00',
    alreadyGiven: '100.00',
    remainingCredits: '400.00',
    note: 'VIP Customer',
    serviceDuration: '12'
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567891',
    address: '456 Oak Ave, Los Angeles, CA',
    status: 'inactive',
    avatar: '/images/user/user-03.png',
    role: 'Standard Customer',
    mac: 'BB:CC:DD:EE:FF:AA',
    box: 'BOX002',
    startDate: '2024-02-01',
    paymentDate: '2024-02-01',
    paymentMode: 'PayPal',
    amount: '79.99',
    expiryDate: '2024-11-01',
    totalCredit: '300.00',
    alreadyGiven: '50.00',
    remainingCredits: '250.00',
    note: 'Regular Customer',
    serviceDuration: '12'
  },
  {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '+1234567892',
    address: '789 Pine St, Chicago, IL',
    status: 'active',
    avatar: '/images/user/user-04.png',
    role: 'Basic Customer',
    mac: 'CC:DD:EE:FF:AA:BB',
    box: 'BOX003',
    startDate: '2024-03-01',
    paymentDate: '2024-03-01',
    paymentMode: 'Bank Transfer',
    amount: '129.99',
    expiryDate: '2025-02-01',
    totalCredit: '800.00',
    alreadyGiven: '200.00',
    remainingCredits: '600.00',
    note: 'Premium Customer',
    serviceDuration: '12'
  }
];

const ensureSampleCustomers = async () => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from('customers').select('id').limit(1);

  assertNoSupabaseError(error, 'Unable to check existing customers');

  if (Array.isArray(data) && data.length > 0) {
    return getAll();
  }

  const preparedCustomers = await Promise.all(
    sampleCustomers().map(async (customer) => ({
      ...mapPayloadToRow(customer),
      portal_password_hash: await bcrypt.hash(generatePortalPassword(), 12),
      portal_access_enabled: true,
      portal_reset_required: true
    }))
  );

  const { error: insertError } = await supabase
    .from('customers')
    .insert(preparedCustomers);

  assertNoSupabaseError(insertError, 'Unable to seed sample customers');
  return getAll();
};

const getAll = async () => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  assertNoSupabaseError(error, 'Unable to fetch customers');
  return Promise.all(
    (data || []).map(async (row) => {
      const [subscriptions, payments] = await Promise.all([
        getSubscriptionsByCustomerId(row.id),
        getPaymentsByCustomerId(row.id)
      ]);

      return mapRowToCustomer(row, subscriptions, payments);
    })
  );
};

const getById = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch customer');

  if (!data) {
    return null;
  }

  const [subscriptions, payments] = await Promise.all([
    getSubscriptionsByCustomerId(id),
    getPaymentsByCustomerId(id)
  ]);
  return mapRowToCustomer(data, subscriptions, payments);
};

const findByEmail = async (email) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', String(email).trim().toLowerCase())
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to find customer by email');
  return mapRowToCustomer(data, []);
};

const findByPhone = async (phone) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', normalizePhoneNumber(phone))
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to find customer by phone');
  return mapRowToCustomer(data, []);
};

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
      portal_reset_required: preparedPayload.portalResetRequired
    })
    .select('*')
    .single();

  try {
    assertNoSupabaseError(error, 'Unable to create customer');
    await createSubscriptionsForCustomer(data.id, preparedPayload);
    await persistFinancialSnapshot(data.id);
    const customer = await getById(data.id);
    return {
      ...customer,
      portalSetup: {
        temporaryPassword: temporaryPortalPassword,
        resetRequired: true
      }
    };
  } catch (creationError) {
    if (data?.id) {
      await supabase.from('customers').delete().eq('id', data.id);
    }

    throw creationError;
  }
};

const update = async (id, updates) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .update(mapPayloadToRow(updates))
    .eq('id', id)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to update customer');

  if (!data) {
    return null;
  }

  await syncPrimarySubscription(mapRowToCustomer(data, []));
  return getById(id);
};

const getPortalCustomerById = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('portal_access_enabled', true)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch portal customer');

  if (!data) {
    return null;
  }

  const [subscriptions, payments] = await Promise.all([
    getSubscriptionsByCustomerId(id),
    getPaymentsByCustomerId(id)
  ]);
  return mapRowToCustomer(data, subscriptions, payments);
};

const authenticatePortalCustomer = async (email, password) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', String(email).trim().toLowerCase())
    .eq('portal_access_enabled', true)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch customer portal account');

  if (!data?.portal_password_hash) {
    return null;
  }

  const isMatch = await bcrypt.compare(password, data.portal_password_hash);

  if (!isMatch) {
    return null;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('customers')
    .update({ portal_last_login: now })
    .eq('id', data.id);

  assertNoSupabaseError(updateError, 'Unable to update customer portal last login');

  const subscriptions = await getSubscriptionsByCustomerId(data.id);
  const payments = await getPaymentsByCustomerId(data.id);
  return mapRowToCustomer(
    {
      ...data,
      portal_last_login: now
    },
    subscriptions,
    payments
  );
};

const changePortalPassword = async (customerId, currentPassword, newPassword) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
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
      portal_reset_required: false
    })
    .eq('id', customerId);

  assertNoSupabaseError(updateError, 'Unable to update customer portal password');
  return { success: true };
};

const resetPortalPassword = async (customerId) => {
  const supabase = getSupabaseServiceClient();
  const temporaryPassword = generatePortalPassword();
  const { data, error } = await supabase
    .from('customers')
    .update({
      portal_password_hash: await bcrypt.hash(temporaryPassword, 12),
      portal_access_enabled: true,
      portal_reset_required: true
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
    temporaryPassword
  };
};

const addServiceSubscription = async (customerId, service) => {
  await saveServiceSubscription(customerId, service);
  await persistFinancialSnapshot(customerId);

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

  await persistFinancialSnapshot(customerId);

  return getById(customerId);
};

const recordCustomerPayment = async (customerId, payload) => {
  const supabase = getSupabaseServiceClient();
  const subscriptionIds = Array.isArray(payload.subscriptionIds)
    ? payload.subscriptionIds.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (subscriptionIds.length === 0) {
    throw new Error('Choose at least one service for this payment.');
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('customer_subscriptions')
    .select(`
      id,
      customer_id,
      expiry_date,
      status,
      amount,
      service_label,
      subscription_plans (
        duration_days
      )
    `)
    .eq('customer_id', customerId)
    .in('id', subscriptionIds);

  assertNoSupabaseError(subscriptionsError, 'Unable to fetch services for payment');

  if (!Array.isArray(subscriptions) || subscriptions.length !== subscriptionIds.length) {
    throw new Error('One or more selected services could not be found for this customer.');
  }

  const selectedTotal = subscriptions.reduce((sum, subscription) => sum + parseNumeric(subscription.amount), 0);
  const submittedAmount = parseNumeric(payload.amount);
  const paymentAmount = submittedAmount > 0 ? submittedAmount : selectedTotal;
  const paymentMode = normalizePaymentMode(payload.paymentMode);
  const transactionId = String(payload.transactionId || generateTransactionId()).trim();
  const paymentDateValue = payload.paymentDate || new Date().toISOString();
  const paymentDate = new Date(paymentDateValue);

  if (Number.isNaN(paymentDate.getTime())) {
    throw new Error('Payment date is invalid.');
  }

  const paymentDateIso = paymentDate.toISOString();
  let remainingAllocation = paymentAmount;
  const paymentRows = [];

  for (const subscription of subscriptions) {
    const serviceAmount = parseNumeric(subscription.amount);
    const allocatedAmount = Math.min(remainingAllocation, serviceAmount);
    const isFullyPaid = allocatedAmount >= serviceAmount;
    const durationDays =
      Number(
        Array.isArray(subscription.subscription_plans)
          ? subscription.subscription_plans[0]?.duration_days
          : subscription.subscription_plans?.duration_days
      ) || 30;

    let nextDueDate = null;

    if (isFullyPaid) {
      const currentExpiry = subscription.expiry_date || new Date().toISOString().slice(0, 10);
      const todayIso = new Date().toISOString().slice(0, 10);
      const baseDate = currentExpiry >= todayIso ? currentExpiry : todayIso;
      nextDueDate = addDays(baseDate, durationDays);

      const { error: updateError } = await supabase
        .from('customer_subscriptions')
        .update({
          status: 'active',
          expiry_date: nextDueDate
        })
        .eq('id', subscription.id)
        .eq('customer_id', customerId);

      assertNoSupabaseError(updateError, 'Unable to renew the selected service');
    }

    paymentRows.push({
      customer_id: customerId,
      subscription_id: subscription.id,
      amount: allocatedAmount,
      discount: 0,
      tax: 0,
      payment_mode: paymentMode,
      transaction_id: transactionId,
      status: isFullyPaid ? 'paid' : 'pending',
      payment_date: paymentDateIso,
      next_due_date: nextDueDate
    });

    remainingAllocation = Math.max(remainingAllocation - allocatedAmount, 0);
  }

  if (remainingAllocation > 0) {
    paymentRows.push({
      customer_id: customerId,
      subscription_id: null,
      amount: remainingAllocation,
      discount: 0,
      tax: 0,
      payment_mode: paymentMode,
      transaction_id: transactionId,
      status: 'paid',
      payment_date: paymentDateIso,
      next_due_date: null
    });
  }

  const { error: paymentInsertError } = await supabase.from('payments').insert(paymentRows);
  assertNoSupabaseError(paymentInsertError, 'Unable to save customer payment');

  const primaryServiceId = subscriptionIds[0];
  const { data: primarySubscription, error: primarySubscriptionError } = await supabase
    .from('customer_subscriptions')
    .select('service_code, expiry_date, amount')
    .eq('id', primaryServiceId)
    .eq('customer_id', customerId)
    .maybeSingle();

  assertNoSupabaseError(primarySubscriptionError, 'Unable to refresh primary service after payment');

  const { error: customerUpdateError } = await supabase
    .from('customers')
    .update({
      payment_date: paymentDateIso,
      payment_mode: paymentMode,
      transaction_id: transactionId,
      amount: selectedTotal,
      expiry_date: primarySubscription?.expiry_date || null,
      service_id: primarySubscription?.service_code || null
    })
    .eq('id', customerId);

  assertNoSupabaseError(customerUpdateError, 'Unable to refresh customer payment summary');
  await persistFinancialSnapshot(customerId);
  return getById(customerId);
};

const remove = async (id) => {
  const existingCustomer = await getById(id);

  if (!existingCustomer) {
    return false;
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('customers').delete().eq('id', id);

  assertNoSupabaseError(error, 'Unable to delete customer');
  return true;
};

module.exports = {
  ensureSampleCustomers,
  getAll,
  getById,
  getPortalCustomerById,
  authenticatePortalCustomer,
  changePortalPassword,
  resetPortalPassword,
  addServiceSubscription,
  updateServiceSubscription,
  recordCustomerPayment,
  findByEmail,
  findByPhone,
  create,
  update,
  remove
};
