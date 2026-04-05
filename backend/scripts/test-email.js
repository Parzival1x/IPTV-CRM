require('../config/runtime');

const nodemailer = require('nodemailer');

const requiredKeys = ['EMAIL_FROM', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

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

    parsed[rawArg.slice(2, separatorIndex)] = rawArg.slice(separatorIndex + 1);
  }

  return parsed;
};

const printUsage = () => {
  console.log('SMTP verification utility');
  console.log('');
  console.log('Examples:');
  console.log('  npm.cmd run email:test');
  console.log('  npm.cmd run email:test -- --to=you@example.com');
};

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

const run = async () => {
  const args = parseArgs();

  if (args.help === 'true') {
    printUsage();
    return;
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing required SMTP env vars: ${missingKeys.join(', ')}`);
  }

  const transporter = createTransport();
  await transporter.verify();

  console.log('SMTP verification succeeded.');
  console.log(`- Host: ${process.env.SMTP_HOST}`);
  console.log(`- Port: ${process.env.SMTP_PORT}`);
  console.log(`- Secure: ${process.env.SMTP_SECURE === 'true'}`);
  console.log(`- From: ${process.env.EMAIL_FROM}`);

  if (!args.to) {
    console.log('');
    console.log('No test recipient was provided. Use --to=email@example.com to send a live test email.');
    return;
  }

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: args.to,
    subject: 'StreamOps IPTV SMTP test',
    text: 'This is a test email from the StreamOps IPTV backend SMTP check.',
    html: '<p>This is a test email from the <strong>StreamOps IPTV</strong> backend SMTP check.</p>'
  });

  console.log('');
  console.log('Live test email sent successfully.');
  console.log(`- Recipient: ${args.to}`);
  console.log(`- Message ID: ${result.messageId}`);
};

run().catch((error) => {
  console.error(`Email test failed: ${error.message}`);
  process.exitCode = 1;
});
