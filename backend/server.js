const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getSupabaseServiceClient } = require('./config/supabase');
const { isDevelopment, isProduction, frontendOriginAliases } = require('./config/runtime');
const logger = require('./config/logger');
const adminRepository = require('./repositories/adminRepository');
const customerRepository = require('./repositories/customerRepository');
const schedulerService = require('./services/schedulerService');
const { getNotificationStatus } = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 3001;

// The rate limiters key on req.ip. Behind a reverse proxy (nginx, Render, Fly)
// Express reports the proxy's address unless it knows how many hops to trust,
// which would collapse every client into a single bucket. 0 trusts nothing,
// which is correct for direct exposure and local development. Set
// TRUST_PROXY_HOPS to the number of proxies in front of this server.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || frontendOriginAliases.includes(origin)) {
        callback(null, true);
        return;
      }

      // Log it: a legitimate deployment hitting this is a misconfigured
      // FRONTEND_URL, and the browser-side error says nothing useful.
      logger.warn('Blocked a cross-origin request', { origin });
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// The webhook signature is an HMAC over the exact bytes Meta sent, so the raw
// body has to survive JSON parsing. Capturing it for every request would mean
// holding two copies of every payload, so it is captured only where it is
// verified.
app.use(
  express.json({
    limit: '2mb',
    verify(req, _res, buffer) {
      if (req.originalUrl.startsWith('/api/webhooks/')) {
        req.rawBody = buffer;
      }
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customer-auth', require('./routes/customerAuth'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/service-requests', require('./routes/serviceRequests'));
app.use('/api/admin-notifications', require('./routes/adminNotifications'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/reports', require('./routes/reports'));

// Reports both database reachability and whether the schema has been applied.
// A running server against a stale schema used to look healthy right up until
// the first payment failed.
app.get('/api/health', async (req, res) => {
  const checks = { database: 'unknown', schema: 'unknown' };

  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from('admin_users').select('id').limit(1);

    if (error) {
      throw error;
    }

    checks.database = 'connected';

    // customer_financials is created by install.sql. Probing it is a cheap
    // proxy for "the schema in this database matches this build".
    const { error: schemaError } = await supabase
      .from('customer_financials')
      .select('customer_id')
      .limit(1);

    checks.schema = schemaError ? 'outdated' : 'current';

    if (schemaError) {
      return res.status(503).json({
        status: 'DEGRADED',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        provider: 'Supabase',
        checks,
        message:
          'Database reachable but the schema is not applied. Run backend/supabase/install.sql in the Supabase SQL editor.'
      });
    }

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      provider: 'Supabase',
      checks,
      scheduler: schedulerService.getStatus()
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      provider: 'Supabase',
      checks,
      message: isProduction ? 'Database unavailable' : error.message
    });
  }
});

// The 404 has to come before the error handler: Express matches in order, and
// a four-argument error handler registered first never sees an unmatched
// route, so the catch-all below would be unreachable behind it.
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Express identifies the error handler by its arity, so `next` has to stay in
// the signature even though it is never called.
app.use((err, req, res, next) => {
  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }

  logger.error('Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    error: err
  });

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: isProduction ? undefined : err.message
  });
});

const bootstrapApplication = async () => {
  if (isDevelopment && process.env.SEED_DEFAULT_ADMIN !== 'false') {
    await adminRepository.seedInitialAdmin({
      name: process.env.DEV_ADMIN_NAME || 'Admin User',
      email: process.env.DEV_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.DEV_ADMIN_PASSWORD || 'admin123',
      role: process.env.DEV_ADMIN_ROLE || 'admin'
    });
  }

  if (isDevelopment && process.env.SEED_SAMPLE_CUSTOMERS !== 'false') {
    await customerRepository.ensureSampleCustomers();
  }
};

const startServer = async () => {
  await bootstrapApplication();

  const server = app.listen(PORT, () => {
    const notificationStatus = getNotificationStatus();

    logger.info('Server started', {
      port: PORT,
      api: `http://localhost:${PORT}/api`,
      emailConfigured: notificationStatus.emailConfigured,
      whatsappConfigured: notificationStatus.whatsappConfigured,
      webhookConfigured: notificationStatus.webhookConfigured
    });

    schedulerService.start();
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        `Port ${PORT} is already in use. Stop the existing backend process or run close-ports.ps1 before starting a new one.`
      );
      process.exitCode = 1;
      return;
    }

    logger.error('Failed to bind server', { error });
    process.exitCode = 1;
  });

  // Stop accepting connections and let in-flight requests finish, rather than
  // dropping them the instant the platform sends SIGTERM on a deploy.
  const shutdown = (signal) => {
    logger.info('Shutting down', { signal });
    schedulerService.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
};

// Nothing awaited these before, so a rejected promise in a background path
// printed a deprecation warning and, on current Node, takes the process down
// with no explanation of what failed.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: reason });
});

if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server', { error });

    if (error.code === 'PGRST205') {
      logger.error(
        'Supabase schema is missing. Run backend/supabase/install.sql in the Supabase SQL editor.'
      );
    }

    process.exitCode = 1;
  });
}

module.exports = app;
module.exports.startServer = startServer;
