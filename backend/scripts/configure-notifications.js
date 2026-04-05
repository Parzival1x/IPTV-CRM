const fs = require('fs');
const path = require('path');
const readline = require('readline');

require('../config/runtime');

const envPath = path.resolve(__dirname, '../../.env');
const exampleEnvPath = path.resolve(__dirname, '../../.env.example');

const promptInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) =>
  new Promise((resolve) => {
    promptInterface.question(question, (answer) => {
      resolve(answer.trim());
    });
  });

const parseEnvFile = (fileContent) => {
  const values = {};

  for (const line of fileContent.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1);

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

const stringifyEnvValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (!stringValue) {
    return '';
  }

  if (/[#\s"]/g.test(stringValue)) {
    return `"${stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  return stringValue;
};

const mergeEnvContent = (originalContent, updates) => {
  const lines = originalContent.split(/\r?\n/);
  const seenKeys = new Set();
  const nextLines = lines.map((line) => {
    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      return line;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!Object.prototype.hasOwnProperty.call(updates, key)) {
      return line;
    }

    seenKeys.add(key);
    return `${key}=${stringifyEnvValue(updates[key])}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seenKeys.has(key)) {
      nextLines.push(`${key}=${stringifyEnvValue(value)}`);
    }
  }

  return `${nextLines.join('\n').replace(/\n+$/, '')}\n`;
};

const maskValue = (value) => {
  if (!value) {
    return 'not set';
  }

  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const getDefaultEnvContent = () => {
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, 'utf8');
  }

  if (fs.existsSync(exampleEnvPath)) {
    return fs.readFileSync(exampleEnvPath, 'utf8');
  }

  return '';
};

const askForValue = async ({ label, key, currentValue, fallbackValue = '' }) => {
  const preview = currentValue ? ` [current: ${maskValue(currentValue)}]` : '';
  const answer = await ask(`${label}${preview}: `);

  if (answer) {
    return answer;
  }

  if (currentValue) {
    return currentValue;
  }

  return fallbackValue;
};

const askYesNo = async (question, defaultValue = true) => {
  const suffix = defaultValue ? ' [Y/n]: ' : ' [y/N]: ';
  const answer = (await ask(`${question}${suffix}`)).toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === 'y' || answer === 'yes';
};

const run = async () => {
  const existingContent = getDefaultEnvContent();
  const envValues = parseEnvFile(existingContent);

  console.log('');
  console.log('Notification setup wizard');
  console.log('This updates the project root .env file for WhatsApp and SMTP delivery.');
  console.log('');

  const updates = {};

  if (await askYesNo('Configure WhatsApp Cloud API now?', true)) {
    console.log('');
    console.log('Paste the Meta values below. The access token input is visible in the terminal.');
    updates.WHATSAPP_PHONE_NUMBER_ID = await askForValue({
      label: 'WhatsApp Phone Number ID',
      key: 'WHATSAPP_PHONE_NUMBER_ID',
      currentValue: envValues.WHATSAPP_PHONE_NUMBER_ID
    });
    updates.WHATSAPP_ACCESS_TOKEN = await askForValue({
      label: 'WhatsApp Access Token',
      key: 'WHATSAPP_ACCESS_TOKEN',
      currentValue: envValues.WHATSAPP_ACCESS_TOKEN
    });
  }

  if (await askYesNo('Configure email SMTP now?', true)) {
    console.log('');
    updates.EMAIL_FROM = await askForValue({
      label: 'Email From',
      key: 'EMAIL_FROM',
      currentValue: envValues.EMAIL_FROM,
      fallbackValue: 'Abhishek Jangra <i.abhishekjangra@gmail.com>'
    });
    updates.SMTP_HOST = await askForValue({
      label: 'SMTP Host',
      key: 'SMTP_HOST',
      currentValue: envValues.SMTP_HOST,
      fallbackValue: 'smtp.gmail.com'
    });
    updates.SMTP_PORT = await askForValue({
      label: 'SMTP Port',
      key: 'SMTP_PORT',
      currentValue: envValues.SMTP_PORT,
      fallbackValue: '465'
    });

    const portDefaultSecure = String(updates.SMTP_PORT || envValues.SMTP_PORT || '587') === '465';
    updates.SMTP_SECURE = String(
      await askYesNo('Use secure SMTP?', portDefaultSecure)
    );
    updates.SMTP_USER = await askForValue({
      label: 'SMTP Username',
      key: 'SMTP_USER',
      currentValue: envValues.SMTP_USER
    });
    updates.SMTP_PASS = await askForValue({
      label: 'SMTP Password or App Password',
      key: 'SMTP_PASS',
      currentValue: envValues.SMTP_PASS
    });
  }

  if (Object.keys(updates).length === 0) {
    console.log('');
    console.log('Nothing was changed.');
    return;
  }

  const mergedContent = mergeEnvContent(existingContent, updates);
  fs.writeFileSync(envPath, mergedContent, 'utf8');

  console.log('');
  console.log(`Saved notification settings to ${envPath}`);
  console.log('Next steps:');
  console.log('1. Restart the backend');
  console.log('2. Run `cd backend && npm.cmd run notifications:test -- --list-customers`');
  console.log('3. Run a test send against one real customer record');
};

run()
  .catch((error) => {
    console.error(error.message || 'Notification setup failed.');
    process.exitCode = 1;
  })
  .finally(() => {
    promptInterface.close();
  });
