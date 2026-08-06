const nodemailer = require('nodemailer');
const { getSupabaseServiceClient } = require('../config/supabase');
const { defaultCurrency } = require('../config/runtime');
const logger = require('../config/logger');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatMoney = (amount, currency = defaultCurrency) => {
  const parsed = Number(String(amount ?? '').replace(/[^0-9.-]/g, ''));

  if (!Number.isFinite(parsed)) {
    return String(amount ?? '');
  }

  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parsed);
  } catch {
    return `${currency} ${parsed.toFixed(2)}`;
  }
};

// Customer-supplied values reach these templates (name, service label, an
// admin's free-text message), and the result is sent as HTML. Every
// interpolation into the HTML body is escaped; the plain-text body needs no
// escaping but must never be reused as HTML.
const templateCatalog = {
  welcome: {
    whatsappType: 'welcome',
    emailSubject: 'Welcome to StreamOps IPTV',
    render: (customer) => ({
      whatsapp: `Hello ${customer.name}, welcome to StreamOps IPTV. Your customer code is ${customer.customerCode} and your service reference is ${customer.serviceId}.`,
      emailText: `Hello ${customer.name}, welcome to StreamOps IPTV.\n\nCustomer code: ${customer.customerCode}\nService reference: ${customer.serviceId}\nTransaction reference: ${customer.transactionId}\n\nThank you for choosing us.`,
      emailHtml: `<p>Hello ${escapeHtml(customer.name)},</p><p>Welcome to StreamOps IPTV.</p><ul><li><strong>Customer code:</strong> ${escapeHtml(customer.customerCode)}</li><li><strong>Service reference:</strong> ${escapeHtml(customer.serviceId)}</li><li><strong>Transaction reference:</strong> ${escapeHtml(customer.transactionId)}</li></ul><p>Thank you for choosing us.</p>`
    })
  },
  payment_due: {
    whatsappType: 'payment_due',
    emailSubject: 'Payment due reminder',
    render: (customer, metadata) => {
      const amount = formatMoney(
        metadata.amount || customer.paymentSummary?.dueNow || customer.amount,
        metadata.currency || customer.currency
      );
      const dueDate = metadata.dueDate || customer.expiryDate || 'the scheduled date';

      return {
        whatsapp: `Hi ${customer.name}, your payment of ${amount} is due on ${dueDate}. Transaction reference: ${customer.transactionId}.`,
        emailText: `Hi ${customer.name},\n\nThis is a reminder that your payment of ${amount} is due on ${dueDate}.\nTransaction reference: ${customer.transactionId}\n\nPlease reply if you need assistance.`,
        emailHtml: `<p>Hi ${escapeHtml(customer.name)},</p><p>This is a reminder that your payment of <strong>${escapeHtml(amount)}</strong> is due on <strong>${escapeHtml(dueDate)}</strong>.</p><p><strong>Transaction reference:</strong> ${escapeHtml(customer.transactionId)}</p><p>Please reply if you need assistance.</p>`
      };
    }
  },
  renewal_reminder: {
    whatsappType: 'reminder',
    emailSubject: 'Subscription renewal reminder',
    render: (customer, metadata) => {
      const serviceName = metadata.serviceName || customer.serviceId || 'your service';
      const expiryDate = metadata.expiryDate || customer.expiryDate || 'the scheduled expiry date';
      const amount = metadata.amount
        ? formatMoney(metadata.amount, metadata.currency || customer.currency)
        : null;
      const amountLine = amount ? ` The renewal amount is ${amount}.` : '';

      return {
        whatsapp: `Hi ${customer.name}, your service ${serviceName} expires on ${expiryDate}.${amountLine} Please renew in time to avoid interruption.`,
        emailText: `Hi ${customer.name},\n\nYour service ${serviceName} expires on ${expiryDate}.${amountLine}\nPlease renew in time to avoid interruption.\n\nCustomer code: ${customer.customerCode}`,
        emailHtml: `<p>Hi ${escapeHtml(customer.name)},</p><p>Your service <strong>${escapeHtml(serviceName)}</strong> expires on <strong>${escapeHtml(expiryDate)}</strong>.${escapeHtml(amountLine)}</p><p>Please renew in time to avoid interruption.</p><p><strong>Customer code:</strong> ${escapeHtml(customer.customerCode)}</p>`
      };
    }
  },
  portal_credentials: {
    whatsappType: 'alert',
    emailSubject: 'Your StreamOps portal password',
    render: (customer, metadata) => {
      const password = metadata.temporaryPassword || '';
      const hours = metadata.expiresInHours || 72;
      const portalUrl = metadata.portalUrl || '';
      const urlLine = portalUrl ? `\nSign in at: ${portalUrl}` : '';

      return {
        whatsapp: `Hi ${customer.name}, your StreamOps portal password is ${password}. It expires in ${hours} hours and you will be asked to choose a new one when you sign in.`,
        emailText: `Hi ${customer.name},\n\nYour temporary portal password is: ${password}\n\nIt expires in ${hours} hours. You will be asked to choose a new password when you sign in.${urlLine}`,
        emailHtml: `<p>Hi ${escapeHtml(customer.name)},</p><p>Your temporary portal password is: <strong>${escapeHtml(password)}</strong></p><p>It expires in ${escapeHtml(String(hours))} hours. You will be asked to choose a new password when you sign in.</p>${portalUrl ? `<p><a href="${escapeHtml(portalUrl)}">Sign in to the portal</a></p>` : ''}`
      };
    }
  },
  custom: {
    whatsappType: 'alert',
    emailSubject: 'Message from StreamOps IPTV',
    render: (_customer, metadata) => ({
      whatsapp: metadata.message || '',
      emailText: metadata.message || '',
      emailHtml: `<p>${escapeHtml(metadata.message || '').replace(/\n/g, '<br />')}</p>`
    })
  }
};

const isEmailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );

const isWhatsAppConfigured = () =>
  Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

const isInternationalPhoneNumber = (value) =>
  /^\+[1-9]\d{7,14}$/.test(String(value || '').trim());

const isValidEmailAddress = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const mapWhatsAppErrorMessage = (providerMessage, targetNumber) => {
  if (providerMessage.includes('Account not registered')) {
    return `Meta rejected the target WhatsApp number ${targetNumber}. It usually means the number is not an active WhatsApp account, the number is not allowed in your current test/sandbox setup, or the saved number format is wrong. Use full international format like +919876543210.`;
  }

  if (providerMessage.includes('Cannot parse access token')) {
    return 'The WhatsApp access token is invalid or expired.';
  }

  return providerMessage;
};

const mapEmailErrorMessage = (providerMessage) => {
  const normalized = String(providerMessage || '');

  if (
    normalized.includes('Invalid login') ||
    normalized.includes('AUTH') ||
    normalized.toLowerCase().includes('authentication')
  ) {
    return 'The SMTP username or password was rejected by the mail provider.';
  }

  if (normalized.includes('ECONNECTION') || normalized.includes('ETIMEDOUT')) {
    return 'The SMTP server could not be reached. Check SMTP host, port, firewall, or provider settings.';
  }

  if (normalized.includes('ESOCKET')) {
    return 'The SMTP connection failed during TLS or socket setup. Check SMTP port and the SMTP_SECURE setting.';
  }

  if (normalized.includes('EENVELOPE')) {
    return 'The mail provider rejected the sender or recipient address.';
  }

  return normalized || 'Email delivery failed.';
};

const getMessageContent = (templateName, customer, metadata = {}) => {
  const selectedTemplate = templateCatalog[templateName] || templateCatalog.custom;
  return {
    selectedTemplate,
    ...selectedTemplate.render(customer, metadata)
  };
};

// One pooled transport rather than one per message. The previous code built a
// fresh transport for every send, which opens a new SMTP connection each time
// and gets rate limited by most providers once anything sends in bulk.
let cachedTransport = null;

const getMailTransport = () => {
  if (cachedTransport) {
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
    maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100)
  });

  return cachedTransport;
};

const logActivity = async (action, customerId, metadata = {}, userId = null) => {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('activity_logs').insert({
    action,
    customer_id: customerId,
    user_id: userId,
    entity_type: 'notification',
    metadata
  });

  if (error) {
    logger.error('Failed to log notification activity', { action, customerId, error });
  }
};

const logEmailMessage = async ({
  customerId,
  templateName,
  subject,
  bodyText,
  bodyHtml,
  status,
  providerMessageId = null,
  errorMessage = null
}) => {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('email_messages').insert({
    customer_id: customerId,
    template_name: templateName,
    subject,
    message_text: bodyText,
    message_html: bodyHtml,
    status,
    provider_message_id: providerMessageId,
    error_message: errorMessage,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    failed_at: status === 'failed' ? new Date().toISOString() : null
  });

  if (error) {
    logger.error('Failed to log email message', { customerId, error });
  }
};

const logWhatsAppMessage = async ({
  customerId,
  templateName,
  messageType,
  messageContent,
  status,
  providerMessageId = null,
  errorMessage = null
}) => {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('whatsapp_messages').insert({
    customer_id: customerId,
    message_type: messageType,
    template_name: templateName,
    message_content: messageContent,
    status,
    provider_message_id: providerMessageId,
    error_message: errorMessage,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    failed_at: status === 'failed' ? new Date().toISOString() : null
  });

  if (error) {
    logger.error('Failed to log WhatsApp message', { customerId, error });
  }
};

// `whatsapp_opt_in` and `email_opt_in` have been columns on `customers` since
// the first schema and were read by nothing at all, so an opt-out was recorded
// and then ignored on every send. Transactional messages a customer cannot
// opt out of -- their own portal credentials -- are the single exception, and
// it has to be named explicitly by the caller.
const TRANSACTIONAL_TEMPLATES = new Set(['portal_credentials']);

const isOptedIn = (customer, channel, templateName) => {
  if (TRANSACTIONAL_TEMPLATES.has(templateName)) {
    return true;
  }

  return channel === 'email' ? customer.emailOptIn !== false : customer.whatsappOptIn !== false;
};

class NotificationError extends Error {
  constructor(message, { channel, code = 'delivery_failed' } = {}) {
    super(message);
    this.name = 'NotificationError';
    this.channel = channel;
    this.code = code;
  }
}

const sendEmailNotification = async ({ customer, templateName, metadata = {}, subject }) => {
  if (!customer.email) {
    throw new NotificationError('Customer email address is missing.', {
      channel: 'email',
      code: 'missing_recipient'
    });
  }

  if (!isValidEmailAddress(customer.email)) {
    throw new NotificationError('Customer email address is not valid.', {
      channel: 'email',
      code: 'invalid_recipient'
    });
  }

  if (!isEmailConfigured()) {
    throw new NotificationError('Email delivery is not configured on the server.', {
      channel: 'email',
      code: 'not_configured'
    });
  }

  const { selectedTemplate, emailText, emailHtml } = getMessageContent(
    templateName,
    customer,
    metadata
  );
  const resolvedSubject = subject || selectedTemplate.emailSubject;

  try {
    const result = await getMailTransport().sendMail({
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: resolvedSubject,
      text: emailText,
      html: emailHtml
    });

    await logEmailMessage({
      customerId: customer.id,
      templateName,
      subject: resolvedSubject,
      bodyText: emailText,
      bodyHtml: emailHtml,
      status: 'sent',
      providerMessageId: result.messageId
    });

    return {
      success: true,
      channel: 'email',
      messageId: result.messageId,
      recipient: customer.email
    };
  } catch (error) {
    const errorMessage = mapEmailErrorMessage(error?.message || 'Email delivery failed.');

    await logEmailMessage({
      customerId: customer.id,
      templateName,
      subject: resolvedSubject,
      bodyText: emailText,
      bodyHtml: emailHtml,
      status: 'failed',
      errorMessage
    });

    throw new NotificationError(errorMessage, { channel: 'email' });
  }
};

const sendWhatsAppNotification = async ({ customer, templateName, metadata = {} }) => {
  const targetNumber = customer.whatsappNumber || customer.phone;

  if (!targetNumber) {
    throw new NotificationError('Customer phone or WhatsApp number is missing.', {
      channel: 'whatsapp',
      code: 'missing_recipient'
    });
  }

  if (!isInternationalPhoneNumber(targetNumber)) {
    throw new NotificationError(
      'The customer WhatsApp number must be saved in full international format, for example +919876543210.',
      { channel: 'whatsapp', code: 'invalid_recipient' }
    );
  }

  if (!isWhatsAppConfigured()) {
    throw new NotificationError('WhatsApp delivery is not configured on the server.', {
      channel: 'whatsapp',
      code: 'not_configured'
    });
  }

  const { selectedTemplate, whatsapp } = getMessageContent(templateName, customer, metadata);
  const normalizedTarget = String(targetNumber).trim();

  // Without a timeout a hung provider connection holds the request open until
  // the platform kills it, and in the scheduler it stalls the whole run.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.WHATSAPP_TIMEOUT_MS || 15000));

  let response;
  let responseBody = {};

  try {
    response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedTarget,
          type: 'text',
          text: { preview_url: false, body: whatsapp }
        }),
        signal: controller.signal
      }
    );

    responseBody = await response.json().catch(() => ({}));
  } catch (error) {
    const errorMessage =
      error.name === 'AbortError'
        ? 'The WhatsApp API did not respond in time.'
        : `The WhatsApp API could not be reached: ${error.message}`;

    await logWhatsAppMessage({
      customerId: customer.id,
      templateName,
      messageType: selectedTemplate.whatsappType,
      messageContent: whatsapp,
      status: 'failed',
      errorMessage
    });

    throw new NotificationError(errorMessage, { channel: 'whatsapp' });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok || !responseBody.messages?.[0]?.id) {
    const errorMessage = mapWhatsAppErrorMessage(
      responseBody?.error?.message || 'WhatsApp API rejected the request.',
      normalizedTarget
    );

    await logWhatsAppMessage({
      customerId: customer.id,
      templateName,
      messageType: selectedTemplate.whatsappType,
      messageContent: whatsapp,
      status: 'failed',
      errorMessage
    });

    throw new NotificationError(errorMessage, { channel: 'whatsapp' });
  }

  const providerMessageId = responseBody.messages[0].id;

  await logWhatsAppMessage({
    customerId: customer.id,
    templateName,
    messageType: selectedTemplate.whatsappType,
    messageContent: whatsapp,
    status: 'sent',
    providerMessageId
  });

  return {
    success: true,
    channel: 'whatsapp',
    messageId: providerMessageId,
    recipient: normalizedTarget
  };
};

const getNotificationStatus = () => {
  const emailMissing = ['EMAIL_FROM', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].filter(
    (name) => !process.env[name]
  );
  const whatsappMissing = ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'].filter(
    (name) => !process.env[name]
  );

  return {
    emailConfigured: isEmailConfigured(),
    whatsappConfigured: isWhatsAppConfigured(),
    webhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    emailSender: process.env.EMAIL_FROM || '',
    smtpHost: process.env.SMTP_HOST || '',
    emailMissing,
    whatsappMissing
  };
};

// One channel failing no longer aborts the others. Previously the loop threw
// on the first failure, so a customer with a bad phone number never received
// the email either.
const sendCustomerNotifications = async ({
  customer,
  channels,
  templateName,
  metadata = {},
  subject,
  userId
}) => {
  const results = [];
  const skipped = [];

  for (const channel of channels) {
    if (!isOptedIn(customer, channel, templateName)) {
      skipped.push({
        channel,
        reason: `The customer has opted out of ${channel} messages.`
      });
      continue;
    }

    try {
      const result =
        channel === 'email'
          ? await sendEmailNotification({ customer, templateName, metadata, subject })
          : channel === 'whatsapp'
            ? await sendWhatsAppNotification({ customer, templateName, metadata })
            : null;

      if (result) {
        results.push(result);
      }
    } catch (error) {
      results.push({
        success: false,
        channel,
        error: error.message,
        code: error.code || 'delivery_failed'
      });
    }
  }

  await logActivity(
    'customer_notification_sent',
    customer.id,
    {
      channels,
      templateName,
      subject: subject || null,
      delivered: results.filter((result) => result.success).map((result) => result.channel),
      failed: results.filter((result) => !result.success).map((result) => result.channel),
      skipped: skipped.map((entry) => entry.channel)
    },
    userId
  );

  const delivered = results.filter((result) => result.success);

  // Every requested channel either bounced or was suppressed: that is a
  // failure the caller has to see, not a success with an empty result list.
  if (delivered.length === 0 && results.length > 0) {
    const error = new NotificationError(
      results.map((result) => result.error).filter(Boolean).join(' ') || 'Delivery failed.',
      { code: 'all_channels_failed' }
    );
    error.results = results;
    throw error;
  }

  return { results, skipped };
};

// Meta delivers status callbacks (sent -> delivered -> read, or failed) for
// every message. Nothing received them before, so `delivered_at` and the
// `delivered` status existed in the schema and were never written: there was
// no way to tell a message that was accepted by the API from one that actually
// arrived.
const PROVIDER_STATUS_TO_MESSAGE_STATUS = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'delivered',
  failed: 'failed'
};

const recordWhatsAppDeliveryStatus = async ({ providerMessageId, status, errorMessage = null }) => {
  const mapped = PROVIDER_STATUS_TO_MESSAGE_STATUS[status];

  if (!providerMessageId || !mapped) {
    return false;
  }

  const supabase = getSupabaseServiceClient();
  const patch = {
    status: mapped,
    provider_status: status
  };

  if (status === 'delivered' || status === 'read') {
    patch.delivered_at = new Date().toISOString();
  }

  if (status === 'failed') {
    patch.failed_at = new Date().toISOString();
    patch.error_message = errorMessage;
  }

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .update(patch)
    .eq('provider_message_id', providerMessageId)
    .select('id');

  if (error) {
    logger.error('Failed to record WhatsApp delivery status', { providerMessageId, error });
    return false;
  }

  return (data || []).length > 0;
};

module.exports = {
  getNotificationStatus,
  sendCustomerNotifications,
  recordWhatsAppDeliveryStatus,
  NotificationError
};
