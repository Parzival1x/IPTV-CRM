const express = require('express');
const { body, param } = require('express-validator');
const { protect, protectCustomer, requireRole, ROLES } = require('../middleware/auth');
const {
  handleValidationErrors,
  asyncHandler,
  respondWithError
} = require('../middleware/validation');
const { getSupabaseServiceClient } = require('../config/supabase');
const { defaultCurrency } = require('../config/runtime');
const auditRepository = require('../repositories/auditRepository');

const router = express.Router();

// This route was read-only, so there was no way to create, price, rename or
// retire a plan through the application at all. Plans came into existence as a
// side effect of adding a service to a customer -- which also meant editing
// that customer's price rewrote the shared plan for everyone on it.
const mapPlan = (plan) => ({
  id: plan.id,
  planCode: plan.plan_code || '',
  name: plan.name,
  price: Number(plan.price || 0).toFixed(2),
  currency: plan.currency || defaultCurrency,
  durationDays: plan.duration_days,
  durationMonths: plan.duration_months,
  maxConnections: plan.max_connections,
  description: plan.description || '',
  isActive: plan.is_active !== false
});

const listPlans = (includeInactive) => async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    let query = supabase.from('subscription_plans').select('*');

    if (!includeInactive || req.query.includeInactive !== 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('price', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    res.json({ success: true, plans: (data || []).map(mapPlan) });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Unable to fetch subscription plans' });
  }
};

router.get('/', protect, asyncHandler(listPlans(true)));

// Customers only ever see plans that are on sale.
router.get('/portal', protectCustomer, asyncHandler(listPlans(false)));

const planValidators = (optional) => [
  optional
    ? body('planCode').optional().isLength({ min: 2, max: 60 }).trim()
    : body('planCode').isLength({ min: 2, max: 60 }).trim(),
  optional
    ? body('name').optional().isLength({ min: 2, max: 160 }).trim()
    : body('name').isLength({ min: 2, max: 160 }).trim(),
  optional
    ? body('price').optional().isFloat({ min: 0, max: 1000000 })
    : body('price').isFloat({ min: 0, max: 1000000 }),
  body('durationMonths').optional().isInt({ min: 1, max: 36 }),
  body('maxConnections').optional().isInt({ min: 1, max: 20 }),
  body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
  body('description').optional({ values: 'falsy' }).isLength({ max: 2000 }),
  body('isActive').optional().isBoolean()
];

const buildPlanRow = (payload) => {
  const row = {};

  if (payload.planCode !== undefined) row.plan_code = String(payload.planCode).trim();
  if (payload.name !== undefined) row.name = String(payload.name).trim();
  if (payload.price !== undefined) row.price = Number(payload.price);
  if (payload.currency !== undefined) row.currency = String(payload.currency).toUpperCase();
  if (payload.description !== undefined) row.description = payload.description || null;
  if (payload.isActive !== undefined) row.is_active = Boolean(payload.isActive);
  if (payload.maxConnections !== undefined) row.max_connections = Number(payload.maxConnections);

  if (payload.durationMonths !== undefined) {
    const months = Number(payload.durationMonths);
    row.duration_months = months;
    // duration_days is kept in step for anything still reading it, but months
    // is what renewal arithmetic uses -- the two disagreeing is what made
    // every renewal five days short of the year that was paid for.
    row.duration_days = months * 30;
  }

  return row;
};

router.post(
  '/',
  protect,
  requireRole(ROLES.ADMIN),
  planValidators(false),
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          duration_months: 12,
          duration_days: 360,
          max_connections: 1,
          currency: defaultCurrency,
          is_active: true,
          ...buildPlanRow(req.body)
        })
        .select('*')
        .single();

      if (error) {
        throw Object.assign(new Error(error.message), { code: error.code });
      }

      await auditRepository.recordFromRequest(req, 'plan_created', {
        entityType: 'plan',
        entityId: data.id,
        metadata: { planCode: data.plan_code, price: data.price }
      });

      res.status(201).json({ success: true, plan: mapPlan(data) });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to create the subscription plan' });
    }
  })
);

router.put(
  '/:id',
  protect,
  requireRole(ROLES.ADMIN),
  [param('id').isUUID(), ...planValidators(true)],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const supabase = getSupabaseServiceClient();
      const patch = buildPlanRow(req.body);

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ success: false, message: 'Nothing to update.' });
      }

      const { data: before } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from('subscription_plans')
        .update(patch)
        .eq('id', req.params.id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw Object.assign(new Error(error.message), { code: error.code });
      }

      if (!data) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      // Repricing a plan affects every customer subscribed to it from their
      // next renewal onward, so it is worth a specific audit entry rather than
      // a generic "plan updated".
      await auditRepository.recordFromRequest(req, 'plan_updated', {
        entityType: 'plan',
        entityId: data.id,
        metadata: {
          planCode: data.plan_code,
          priceBefore: before?.price,
          priceAfter: data.price,
          fields: Object.keys(patch)
        }
      });

      res.json({ success: true, plan: mapPlan(data) });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to update the subscription plan' });
    }
  })
);

// Retire rather than delete: existing subscriptions reference the plan, and
// removing it would either fail on the foreign key or orphan live services.
router.delete(
  '/:id',
  protect,
  requireRole(ROLES.ADMIN),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const supabase = getSupabaseServiceClient();
      const { count } = await supabase
        .from('customer_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('plan_id', req.params.id)
        .in('status', ['active', 'draft']);

      const { data, error } = await supabase
        .from('subscription_plans')
        .update({ is_active: false })
        .eq('id', req.params.id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw Object.assign(new Error(error.message), { code: error.code });
      }

      if (!data) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      await auditRepository.recordFromRequest(req, 'plan_retired', {
        entityType: 'plan',
        entityId: data.id,
        metadata: { planCode: data.plan_code, activeSubscriptions: count || 0 }
      });

      res.json({
        success: true,
        plan: mapPlan(data),
        message:
          count > 0
            ? `Plan retired. ${count} active subscription(s) keep running on it until they expire.`
            : 'Plan retired.'
      });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to retire the subscription plan' });
    }
  })
);

module.exports = router;
