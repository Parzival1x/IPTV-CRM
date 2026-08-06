const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const DEVELOPMENT_JWT_SECRET = 'dev-only-supabase-secret';
const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

const resolveJwtSecret = () => {
  const configuredSecret = process.env.JWT_SECRET;

  if (!isProduction) {
    return configuredSecret || DEVELOPMENT_JWT_SECRET;
  }

  // The fallback below is committed to this repository. Reaching production
  // without a real secret would let anyone mint a valid admin token, so refuse
  // to start rather than accept it.
  if (!configuredSecret) {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production.');
  }

  if (configuredSecret === DEVELOPMENT_JWT_SECRET) {
    throw new Error('JWT_SECRET is still the development placeholder. Generate a new secret before deploying.');
  }

  if (configuredSecret.length < MINIMUM_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MINIMUM_PRODUCTION_SECRET_LENGTH} characters when NODE_ENV=production.`
    );
  }

  return configuredSecret;
};

const jwtSecret = resolveJwtSecret();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Vite picks the next free port when 5173 is taken, and developers reach the
// app on both localhost and 127.0.0.1, so development accepts the whole range
// rather than failing CORS in a way that reads as "the backend is down".
//
// Production gets none of that. Previously these aliases were allowed
// regardless of NODE_ENV, which meant a deployed API accepted credentialed
// requests from anything running on the developer's own machine. Production
// allows exactly the configured origins and nothing else.
const DEVELOPMENT_ORIGIN_ALIASES = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// A deployment that serves the frontend from more than one hostname (an apex
// and a www, a custom domain plus the platform's preview URL) sets this rather
// than being forced onto a single origin.
const additionalOrigins = String(process.env.ADDITIONAL_FRONTEND_URLS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendOriginAliases = Array.from(
  new Set(
    [
      frontendUrl,
      ...additionalOrigins,
      ...(isProduction ? [] : DEVELOPMENT_ORIGIN_ALIASES)
    ].filter(Boolean)
  )
);

if (isProduction && frontendOriginAliases.some((origin) => origin.includes('localhost'))) {
  throw new Error(
    'FRONTEND_URL points at localhost while NODE_ENV=production. Set it to the deployed frontend origin.'
  );
}

// Money was formatted as en-US/USD in the browser with nothing recording what
// the stored numbers actually were. The database now carries a currency per
// row; this is the default applied when a new record does not name one.
const defaultCurrency = String(process.env.DEFAULT_CURRENCY || 'USD').toUpperCase();

if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
  throw new Error(`DEFAULT_CURRENCY must be a three-letter ISO code, received "${defaultCurrency}".`);
}

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const scheduler = {
  // Off by default in development so a dev machine does not send real
  // reminders to real customers on startup.
  enabled: parseBoolean(process.env.SCHEDULER_ENABLED, isProduction),
  // Standard five-field cron. Default is 02:00 daily.
  cron: process.env.SCHEDULER_CRON || '0 2 * * *',
  timezone: process.env.SCHEDULER_TIMEZONE || 'UTC',
  // Days before expiry at which a renewal reminder goes out.
  reminderDays: String(process.env.RENEWAL_REMINDER_DAYS || '7,3,1')
    .split(',')
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isInteger(value) && value >= 0)
    .sort((left, right) => right - left),
  reminderChannels: String(process.env.RENEWAL_REMINDER_CHANNELS || 'email')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value === 'email' || value === 'whatsapp'),
  // A cap so a misconfiguration cannot fan out to the entire customer base in
  // one run. Reached the limit? The next run picks up where this one stopped.
  maxRemindersPerRun: parseNumber(process.env.MAX_REMINDERS_PER_RUN, 500)
};

// Temporary portal passwords used to be valid forever.
const portalPasswordTtlHours = parseNumber(process.env.PORTAL_PASSWORD_TTL_HOURS, 72);

module.exports = {
  jwtSecret,
  frontendUrl,
  frontendOriginAliases,
  isProduction,
  isDevelopment,
  defaultCurrency,
  scheduler,
  portalPasswordTtlHours
};
