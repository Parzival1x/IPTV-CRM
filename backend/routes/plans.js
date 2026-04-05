const express = require('express');
const { protect, protectCustomer } = require('../middleware/auth');
const { getSupabaseServiceClient } = require('../config/supabase');

const router = express.Router();

const listPlans = async (_req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      plans: (data || []).map((plan) => ({
        id: plan.id,
        planCode: plan.plan_code || '',
        name: plan.name,
        price: Number(plan.price || 0).toFixed(2),
        durationDays: plan.duration_days,
        maxConnections: plan.max_connections,
        description: plan.description || ''
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch subscription plans'
    });
  }
};

router.get('/', protect, listPlans);
router.get('/portal', protectCustomer, listPlans);

module.exports = router;
