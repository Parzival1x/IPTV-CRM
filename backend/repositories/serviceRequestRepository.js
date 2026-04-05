const { getSupabaseServiceClient } = require('../config/supabase');

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

const formatDateTime = (value) => (value ? new Date(value).toISOString() : null);

const mapRowToServiceRequest = (row) => {
  if (!row) {
    return null;
  }

  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers || null;
  const plan = Array.isArray(row.subscription_plans)
    ? row.subscription_plans[0]
    : row.subscription_plans || null;

  return {
    id: row.id,
    customerId: row.customer_id,
    planId: row.plan_id || '',
    requestedPlanCode: row.requested_plan_code || plan?.plan_code || '',
    requestedPlanName: row.requested_plan_name || plan?.name || 'Requested service',
    requestedDurationMonths: row.requested_duration_months,
    requestedAmount: Number(row.requested_amount || 0).toFixed(2),
    notes: row.notes || '',
    status: row.status,
    adminResponse: row.admin_response || '',
    reviewedBy: row.reviewed_by || '',
    reviewedAt: formatDateTime(row.reviewed_at),
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          customerCode: customer.customer_code || '',
          serviceId: customer.service_id || ''
        }
      : null
  };
};

const getByCustomerId = async (customerId) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      subscription_plans (
        id,
        plan_code,
        name
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  assertNoSupabaseError(error, 'Unable to fetch customer service requests');
  return (data || []).map(mapRowToServiceRequest);
};

const getAll = async (status) => {
  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from('service_requests')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        customer_code,
        service_id
      ),
      subscription_plans (
        id,
        plan_code,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error, 'Unable to fetch service requests');
  return (data || []).map(mapRowToServiceRequest);
};

const getById = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        customer_code,
        service_id
      ),
      subscription_plans (
        id,
        plan_code,
        name
      )
    `)
    .eq('id', id)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch service request');
  return mapRowToServiceRequest(data);
};

const create = async ({
  customerId,
  planId = null,
  requestedPlanCode = null,
  requestedPlanName,
  requestedDurationMonths = 12,
  requestedAmount = 0,
  notes = ''
}) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      customer_id: customerId,
      plan_id: planId,
      requested_plan_code: requestedPlanCode,
      requested_plan_name: requestedPlanName,
      requested_duration_months: requestedDurationMonths,
      requested_amount: requestedAmount,
      notes: notes || null,
      status: 'pending'
    })
    .select('*')
    .single();

  assertNoSupabaseError(error, 'Unable to create service request');
  return mapRowToServiceRequest(data);
};

const review = async ({ id, status, adminResponse = '', reviewedBy = null }) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('service_requests')
    .update({
      status,
      admin_response: adminResponse || null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to update service request');
  return mapRowToServiceRequest(data);
};

module.exports = {
  getByCustomerId,
  getAll,
  getById,
  create,
  review
};
