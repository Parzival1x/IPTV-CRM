const { randomBytes } = require('crypto');

const getDateStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

const generateReference = (prefix) =>
  `${prefix}-${getDateStamp()}-${randomBytes(3).toString('hex').toUpperCase()}`;

const generateCustomerCode = () => generateReference('CUST');
const generateServiceId = () => generateReference('SRV');
const generateTransactionId = () => generateReference('TXN');
const generatePortalPassword = () => `Portal!${randomBytes(4).toString('hex')}`;

module.exports = {
  generateCustomerCode,
  generateServiceId,
  generateTransactionId,
  generatePortalPassword
};
