require('./runtime');

const { createClient } = require('@supabase/supabase-js');

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

let cachedClient = null;

// Called at 44 sites, once or more per request. Building a client allocates a
// fresh fetch stack and connection state each time, so it is memoised. The
// client is stateless for our usage -- no session persistence, no token refresh
// -- which makes a single shared instance safe across concurrent requests.
// Resolution stays lazy so a missing variable still surfaces at the first query
// rather than at import time.
const getSupabaseServiceClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || requireEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedClient;
};

module.exports = {
  getSupabaseServiceClient
};
