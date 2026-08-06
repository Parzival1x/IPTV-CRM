const { getSupabaseServiceClient } = require('../config/supabase');
const logger = require('../config/logger');

// `activity_logs` existed from the first schema and only one code path ever
// wrote to it -- the notification service. Deletes, payment records, service
// edits, portal password resets and role changes left no trace, which is
// exactly the set of actions you need a record of when a customer disputes a
// charge or an account goes missing.
//
// Recording is deliberately best-effort: an audit write that throws must not
// roll back or fail the action it is describing. A failure to log is logged.

const record = async ({
  action,
  adminId = null,
  customerId = null,
  entityType = null,
  entityId = null,
  ipAddress = null,
  metadata = {}
}) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from('activity_logs').insert({
      action,
      user_id: adminId,
      customer_id: customerId,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: ipAddress,
      metadata
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    logger.error('Failed to write audit record', { action, customerId, error });
  }
};

// Convenience wrapper for the common shape: an admin acting on a customer via
// an HTTP request. Pulls the actor and the client address off the request so
// call sites stay one line.
const recordFromRequest = (req, action, details = {}) =>
  record({
    action,
    adminId: req.admin?.id || null,
    ipAddress: req.ip || null,
    ...details
  });

const listForCustomer = async (customerId, limit = 50) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, entity_type, entity_id, metadata, created_at, user_id, admin_users (name, email)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => {
    const actor = Array.isArray(row.admin_users) ? row.admin_users[0] : row.admin_users;

    return {
      id: row.id,
      action: row.action,
      entityType: row.entity_type || '',
      entityId: row.entity_id || '',
      metadata: row.metadata || {},
      createdAt: row.created_at,
      actorName: actor?.name || 'System',
      actorEmail: actor?.email || ''
    };
  });
};

module.exports = {
  record,
  recordFromRequest,
  listForCustomer
};
