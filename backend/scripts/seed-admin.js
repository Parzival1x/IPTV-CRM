const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const adminRepository = require('../repositories/adminRepository');

const run = async () => {
  const admin = await adminRepository.seedInitialAdmin({
    name: process.env.ADMIN_BOOTSTRAP_NAME || process.env.DEV_ADMIN_NAME || 'Admin User',
    email: process.env.ADMIN_BOOTSTRAP_EMAIL || process.env.DEV_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.DEV_ADMIN_PASSWORD || 'admin123',
    role: process.env.ADMIN_BOOTSTRAP_ROLE || process.env.DEV_ADMIN_ROLE || 'admin'
  });

  console.log(`Admin ready: ${admin.email}`);
};

run().catch((error) => {
  console.error('Failed to seed admin:', error.message);
  process.exit(1);
});
