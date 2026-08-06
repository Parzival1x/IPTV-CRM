const { validationResult } = require('express-validator');
const logger = require('../config/logger');

// Every route file carried its own identical copy of this.
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return true;
  }

  return false;
};

// Wraps an async route so a rejected promise reaches the Express error handler
// instead of hanging the request. Express 4 does not await route handlers, so
// an unhandled rejection in one leaves the client waiting until it times out.
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// The admin login and registration routes required six characters and nothing
// else, and the documented development admin password was `admin123`. This is
// deliberately not a complexity-class rule -- length carries far more entropy
// than forcing a punctuation mark -- but it does reject the passwords that
// actually show up in credential-stuffing lists.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'admin123', 'admin1234', 'administrator',
  '12345678', '123456789', '1234567890', 'qwerty123', 'letmein1', 'welcome1',
  'iloveyou', 'abc12345', 'passw0rd', 'p@ssw0rd', 'changeme', 'secret123',
  'admin@123', 'test1234', 'monkey123', 'football1', 'sunshine1', 'trustno1'
]);

const MINIMUM_PASSWORD_LENGTH = 10;

const assertStrongPassword = (value) => {
  const password = String(value || '');

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
  }

  if (password.length > 200) {
    throw new Error('Password must be 200 characters or fewer.');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('That password is too common. Choose something less predictable.');
  }

  // A password made of one repeated character clears any length rule.
  if (new Set(password).size < 4) {
    throw new Error('Password must use at least four different characters.');
  }

  return true;
};

const isInternationalPhoneNumber = (value) =>
  /^\+[1-9]\d{7,14}$/.test(String(value || '').trim());

const assertInternationalPhoneNumber = (label) => (value) => {
  if (!isInternationalPhoneNumber(value)) {
    throw new Error(`${label} must use international format, for example +919876543210`);
  }

  return true;
};

// Turns a repository error into an HTTP response. Repository errors carry
// Postgres codes; anything unrecognised is a 500 and the detail stays in the
// logs rather than going to the client.
const respondWithError = (res, error, { fallback, context = {} } = {}) => {
  if (error?.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'That value is already in use by another record.'
    });
  }

  if (error?.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'A referenced record does not exist.'
    });
  }

  // Errors raised deliberately by a plpgsql function or a repository guard are
  // written for the operator and are safe to show.
  if (error?.expose || error?.code === 'P0001') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  logger.error(fallback, { ...context, error });

  return res.status(500).json({
    success: false,
    message: fallback
  });
};

module.exports = {
  handleValidationErrors,
  asyncHandler,
  assertStrongPassword,
  assertInternationalPhoneNumber,
  isInternationalPhoneNumber,
  respondWithError,
  MINIMUM_PASSWORD_LENGTH
};
