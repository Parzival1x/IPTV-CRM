const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getSupabaseServiceClient } = require('./config/supabase');
const { isDevelopment, frontendOriginAliases } = require('./config/runtime');
const adminRepository = require('./repositories/adminRepository');
const customerRepository = require('./repositories/customerRepository');
const { getNotificationStatus } = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || frontendOriginAliases.includes(origin)) {
        callback(null, true);
        return;
      }

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/customer-auth', require('./routes/customerAuth'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/service-requests', require('./routes/serviceRequests'));
app.use('/api/admin-notifications', require('./routes/adminNotifications'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/plans', require('./routes/plans'));

app.get('/api/health', async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Connected',
      provider: 'Supabase'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Disconnected',
      provider: 'Supabase',
      message: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
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

    console.log(`Server running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log('Data provider: Supabase');
    console.log(`Email delivery: ${notificationStatus.emailConfigured ? 'Configured' : 'Not configured'}`);
    console.log(`WhatsApp delivery: ${notificationStatus.whatsappConfigured ? 'Configured' : 'Not configured'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing backend process or run close-ports.bat before starting a new one.`);
      process.exitCode = 1;
      return;
    }

    console.error('Failed to bind server:', error.message);
    process.exitCode = 1;
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);

  if (error.code === 'PGRST205') {
    console.error('Supabase schema is missing. Run backend/supabase/schema.sql in the Supabase SQL editor or fix DATABASE_URL and run `npm run db:push` from backend.');
  }

  process.exitCode = 1;
});

module.exports = app;
