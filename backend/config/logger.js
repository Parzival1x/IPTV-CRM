// Structured logging.
//
// The codebase used bare console.error(error) in every catch block, which
// produces a message with no request context, no severity, and nothing an
// aggregator can filter on. Once anything runs on a schedule or in the
// background, "which customer was that about" stops being answerable.
//
// This is deliberately not a logging library. It needs to do two things --
// emit one JSON object per line in production so a log shipper can parse it,
// and stay readable in a terminal during development -- and a dependency for
// that is not worth the supply chain.

const { isProduction } = require('./runtime');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = LEVELS[String(process.env.LOG_LEVEL || '').toLowerCase()]
  || (isProduction ? LEVELS.info : LEVELS.debug);

// Anything matching these never reaches the log, at any level. A token or a
// password hash in an error payload is a credential leak into whatever holds
// the logs, and the paths that log request bodies cannot know in advance which
// fields they are carrying.
const REDACTED_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'portalpassword',
  'temporarypassword',
  'password_hash',
  'portal_password_hash',
  'token',
  'accesstoken',
  'access_token',
  'authorization',
  'jwt_secret',
  'supabase_service_role_key',
  'smtp_pass',
  'whatsapp_access_token'
]);

const redact = (value, depth = 0) => {
  if (depth > 6 || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1));
  }

  const output = {};

  for (const [key, entry] of Object.entries(value)) {
    output[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(entry, depth + 1);
  }

  return output;
};

const serializeError = (error) => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: error.code,
      // Stacks are noise in production log storage and useful everywhere else.
      stack: isProduction ? undefined : error.stack
    };
  }

  return { message: String(error) };
};

const emit = (level, message, context = {}) => {
  if (LEVELS[level] < configuredLevel) {
    return;
  }

  const { error, ...rest } = context;
  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...redact(rest),
    ...(error ? { error: serializeError(error) } : {})
  };

  const stream = level === 'error' || level === 'warn' ? console.error : console.log;

  if (isProduction) {
    stream(JSON.stringify(payload));
    return;
  }

  const detail = Object.keys(payload).length > 3
    ? ` ${JSON.stringify({ ...payload, level: undefined, time: undefined, message: undefined })}`
    : '';
  stream(`[${level}] ${message}${detail}`);
};

module.exports = {
  debug: (message, context) => emit('debug', message, context),
  info: (message, context) => emit('info', message, context),
  warn: (message, context) => emit('warn', message, context),
  error: (message, context) => emit('error', message, context)
};
