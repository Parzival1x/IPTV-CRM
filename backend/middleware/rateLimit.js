const rateLimit = require('express-rate-limit');
const { isDevelopment } = require('../config/runtime');

// The global limiter in server.js allows 100 requests per 15 minutes across the
// whole API, which leaves roughly 100 password guesses per window against the
// login routes. These are the only unauthenticated endpoints that check a
// secret, so they get a much tighter budget of their own.
//
// skipSuccessfulRequests means only failed attempts count. A shared office or
// mobile NAT can sign in all day without consuming the allowance, so the limit
// can stay strict without locking out legitimate users.
//
// The key is the client IP via the library's default key generator, which
// groups IPv6 addresses by subnet. Note that req.ip is only meaningful if
// TRUST_PROXY_HOPS is configured to match your deployment -- see server.js.
const createLoginLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 100 : 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many failed sign-in attempts. Please try again in 15 minutes.'
    }
  });

const adminLoginLimiter = createLoginLimiter();
const customerLoginLimiter = createLoginLimiter();

module.exports = {
  adminLoginLimiter,
  customerLoginLimiter
};
