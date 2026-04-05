require('./runtime');

const { createClient } = require('@supabase/supabase-js');

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || requireEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

module.exports = {
  getSupabaseServiceClient
};
