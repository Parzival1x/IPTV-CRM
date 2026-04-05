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

const mapRowToNotification = (row) => {
  if (!row) {
    return null;
  }

  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers || null;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    customerId: row.customer_id || '',
    serviceRequestId: row.service_request_id || '',
    isRead: Boolean(row.is_read),
    readAt: row.read_at || null,
    createdAt: row.created_at || null,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          customerCode: customer.customer_code || ''
        }
      : null
  };
};

const create = async ({ type, title, body, customerId = null, serviceRequestId = null }) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_notifications')
    .insert({
      type,
      title,
      body,
      customer_id: customerId,
      service_request_id: serviceRequestId
    })
    .select('*')
    .single();

  assertNoSupabaseError(error, 'Unable to create admin notification');
  return mapRowToNotification(data);
};

const getAll = async () => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_notifications')
    .select(`
      *,
      customers (
        id,
        name,
        customer_code
      )
    `)
    .order('created_at', { ascending: false });

  assertNoSupabaseError(error, 'Unable to fetch admin notifications');
  return (data || []).map(mapRowToNotification);
};

const markRead = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to mark notification as read');
  return mapRowToNotification(data);
};

module.exports = {
  create,
  getAll,
  markRead
};
