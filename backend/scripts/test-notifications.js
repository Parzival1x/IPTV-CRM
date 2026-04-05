require('../config/runtime');

const customerRepository = require('../repositories/customerRepository');
const { getNotificationStatus, sendCustomerNotifications } = require('../services/notificationService');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};

  for (const rawArg of args) {
    if (!rawArg.startsWith('--')) {
      continue;
    }

    const separatorIndex = rawArg.indexOf('=');

    if (separatorIndex === -1) {
      parsed[rawArg.slice(2)] = 'true';
      continue;
    }

    const key = rawArg.slice(2, separatorIndex);
    const value = rawArg.slice(separatorIndex + 1);
    parsed[key] = value;
  }

  return parsed;
};

const printUsage = () => {
  console.log('Notification test utility');
  console.log('');
  console.log('Examples:');
  console.log('  npm.cmd run notifications:test -- --list-customers');
  console.log(
    '  npm.cmd run notifications:test -- --customer-id=<uuid> --channel=email --template=welcome'
  );
  console.log(
    '  npm.cmd run notifications:test -- --customer-id=<uuid> --channel=whatsapp --template=custom --message=\"Your service is ready.\"'
  );
};

const listCustomers = async () => {
  const customers = await customerRepository.getAll();

  if (customers.length === 0) {
    console.log('No customers found.');
    return;
  }

  console.log('Available customers:');
  for (const customer of customers.slice(0, 20)) {
    console.log(
      `- ${customer.id} | ${customer.name} | ${customer.customerCode || 'no-code'} | ${customer.email || 'no-email'} | ${customer.whatsappNumber || customer.phone || 'no-phone'}`
    );
  }
};

const run = async () => {
  const args = parseArgs();
  const status = getNotificationStatus();

  if (args.help === 'true') {
    printUsage();
    return;
  }

  console.log('Notification configuration status:');
  console.log(`- Email configured: ${status.emailConfigured}`);
  console.log(`- WhatsApp configured: ${status.whatsappConfigured}`);
  console.log('');

  if (args['list-customers'] === 'true') {
    await listCustomers();
    return;
  }

  if (!args['customer-id']) {
    console.log('Missing required argument: --customer-id=<uuid>');
    console.log('');
    printUsage();
    return;
  }

  const customer = await customerRepository.getById(args['customer-id']);

  if (!customer) {
    throw new Error('Customer not found.');
  }

  const channelArg = args.channel || 'email';
  const channels =
    channelArg === 'both'
      ? ['email', 'whatsapp']
      : channelArg.split(',').map((value) => value.trim()).filter(Boolean);

  const templateName = args.template || 'custom';
  const metadata = {};

  if (args.message) {
    metadata.message = args.message;
  }

  if (args.amount) {
    metadata.amount = args.amount;
  }

  if (args['due-date']) {
    metadata.dueDate = args['due-date'];
  }

  if (args['service-name']) {
    metadata.serviceName = args['service-name'];
  }

  if (args['expiry-date']) {
    metadata.expiryDate = args['expiry-date'];
  }

  const results = await sendCustomerNotifications({
    customer,
    channels,
    templateName,
    metadata,
    subject: args.subject
  });

  console.log('Notification send succeeded:');
  console.log(JSON.stringify(results, null, 2));
};

run().catch((error) => {
  console.error(`Notification test failed: ${error.message}`);
  process.exitCode = 1;
});
