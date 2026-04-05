const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const jwtSecret = process.env.JWT_SECRET || 'dev-only-supabase-secret';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const frontendOriginAliases = Array.from(
  new Set(
    [
      frontendUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ].filter(Boolean)
  )
);

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

module.exports = {
  jwtSecret,
  frontendUrl,
  frontendOriginAliases,
  isProduction,
  isDevelopment
};
