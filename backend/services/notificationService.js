const nodemailer = require('nodemailer');
const { getSupabaseServiceClient } = require('../config/supabase');

const templateCatalog = {
  welcome: {
    whatsappType: 'welcome',
    emailSubject: 'Welcome to StreamOps IPTV',
    render: (customer) => ({
      whatsapp: `Hello ${customer.name}, welcome to StreamOps IPTV. Your customer code is ${customer.customerCode} and your service reference is ${customer.serviceId}.`,
      emailText: `Hello ${customer.name}, welcome to StreamOps IPTV.\n\nCustomer code: ${customer.customerCode}\nService reference: ${customer.serviceId}\nTransaction reference: ${customer.transactionId}\n\nThank you for choosing us.`,
      emailHtml: `<p>Hello ${customer.name},</p><p>Welcome to StreamOps IPTV.</p><ul><li><strong>Customer code:</strong> ${customer.customerCode}</li><li><strong>Service reference:</strong> ${customer.serviceId}</li><li><strong>Transaction reference:</strong> ${customer.transactionId}</li></ul><p>Thank you for choosing us.</p>`
    })
  },
  payment_due: {
    whatsappType: 'payment_due',
    emailSubject: 'Payment due reminder',
    render: (customer, metadata) => ({
      whatsapp: `Hi ${customer.name}, your payment of ${metadata.amount || customer.amount} is due on ${metadata.dueDate || customer.paymentDate || 'the scheduled date'}. Transaction reference: ${customer.transactionId}.`,
      emailText: `Hi ${customer.name},\n\nThis is a reminder that your payment of ${metadata.amount || customer.amount} is due on ${metadata.dueDate || customer.paymentDate || 'the scheduled date'}.\nTransaction reference: ${customer.transactionId}\n\nPlease reply if you need assistance.`,
      emailHtml: `<p>Hi ${customer.name},</p><p>This is a reminder that your payment of <strong>${metadata.amount || customer.amount}</strong> is due on <strong>${metadata.dueDate || customer.paymentDate || 'the scheduled date'}</strong>.</p><p><strong>Transaction reference:</strong> ${customer.transactionId}</p><p>Please reply if you need assistance.</p>`
    })
  },
  renewal_reminder: {
    whatsappType: 'reminder',
    emailSubject: 'Subscription renewal reminder',
    render: (customer, metadata) => ({
      whatsapp: `Hi ${customer.name}, your service ${metadata.serviceName || customer.serviceId} expires on ${metadata.expiryDate || customer.expiryDate || 'the scheduled expiry date'}. Please renew in time to avoid interruption.`,
      emailText: `Hi ${customer.name},\n\nYour service ${metadata.serviceName || customer.serviceId} expires on ${metadata.expiryDate || customer.expiryDate || 'the scheduled expiry date'}.\nPlease renew in time to avoid interruption.\n\nCustomer code: ${customer.customerCode}`,
      emailHtml: `<p>Hi ${customer.name},</p><p>Your service <strong>${metadata.serviceName || customer.serviceId}</strong> expires on <strong>${metadata.expiryDate || customer.expiryDate || 'the scheduled expiry date'}</strong>.</p><p>Please renew in time to avoid interruption.</p><p><strong>Customer code:</strong> ${customer.customerCode}</p>`
    })
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

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

const getMailTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

const logActivity = async (action, customerId, metadata = {}, userId = null) => {
  const supabase = getSupabaseServiceClient();
  await supabase.from('activity_logs').insert({
    action,
    customer_id: customerId,
    user_id: userId,
    metadata
  });
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
  await supabase.from('email_messages').insert({
    customer_id: customerId,
    template_name: templateName,
    subject,
    message_text: bodyText,
    message_html: bodyHtml,
    status,
    provider_message_id: providerMessageId,
    error_message: errorMessage,
    sent_at: status === 'sent' ? new Date().toISOString() : null
  });
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
  await supabase.from('whatsapp_messages').insert({
    customer_id: customerId,
    message_type: messageType,
    template_name: templateName,
    message_content: messageContent,
    status,
    provider_message_id: providerMessageId,
    error_message: errorMessage,
    sent_at: status === 'sent' ? new Date().toISOString() : null
  });
};

const sendEmailNotification = async ({ customer, templateName, metadata = {}, subject }) => {
  if (!customer.email) {
    throw new Error('Customer email address is missing.');
  }

  if (!isValidEmailAddress(customer.email)) {
    throw new Error('Customer email address is not valid.');
  }

  if (!isEmailConfigured()) {
    throw new Error('Email delivery is not configured on the server.');
  }

  const { selectedTemplate, emailText, emailHtml } = getMessageContent(
    templateName,
    customer,
    metadata
  );
  const resolvedSubject = subject || selectedTemplate.emailSubject;
  const transporter = getMailTransport();

  try {
    const result = await transporter.sendMail({
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

    throw new Error(errorMessage);
  }
};

const sendWhatsAppNotification = async ({ customer, templateName, metadata = {} }) => {
  const targetNumber = customer.whatsappNumber || customer.phone;

  if (!targetNumber) {
    throw new Error('Customer phone or WhatsApp number is missing.');
  }

  if (!isInternationalPhoneNumber(targetNumber)) {
    throw new Error(
      'The customer WhatsApp number must be saved in full international format, for example +919876543210.'
    );
  }

  if (!isWhatsAppConfigured()) {
    throw new Error('WhatsApp delivery is not configured on the server.');
  }

  const { selectedTemplate, whatsapp } = getMessageContent(templateName, customer, metadata);
  const normalizedTarget = String(targetNumber).trim();
  const response = await fetch(
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
        text: {
          preview_url: false,
          body: whatsapp
        }
      })
    }
  );

  const responseBody = await response.json().catch(() => ({}));

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

    throw new Error(errorMessage);
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
  const emailMissing = [];
  const whatsappMissing = [];

  if (!process.env.EMAIL_FROM) {
    emailMissing.push('EMAIL_FROM');
  }
  if (!process.env.SMTP_HOST) {
    emailMissing.push('SMTP_HOST');
  }
  if (!process.env.SMTP_PORT) {
    emailMissing.push('SMTP_PORT');
  }
  if (!process.env.SMTP_USER) {
    emailMissing.push('SMTP_USER');
  }
  if (!process.env.SMTP_PASS) {
    emailMissing.push('SMTP_PASS');
  }

  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    whatsappMissing.push('WHATSAPP_PHONE_NUMBER_ID');
  }
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    whatsappMissing.push('WHATSAPP_ACCESS_TOKEN');
  }

  return {
    emailConfigured: isEmailConfigured(),
    whatsappConfigured: isWhatsAppConfigured(),
    emailSender: process.env.EMAIL_FROM || '',
    smtpHost: process.env.SMTP_HOST || '',
    emailMissing,
    whatsappMissing
  };
};

const sendCustomerNotifications = async ({
  customer,
  channels,
  templateName,
  metadata = {},
  subject,
  userId
}) => {
  const results = [];

  for (const channel of channels) {
    if (channel === 'email') {
      const result = await sendEmailNotification({
        customer,
        templateName,
        metadata,
        subject
      });
      results.push(result);
    }

    if (channel === 'whatsapp') {
      const result = await sendWhatsAppNotification({
        customer,
        templateName,
        metadata
      });
      results.push(result);
    }
  }

  await logActivity(
    'customer_notification_sent',
    customer.id,
    {
      channels,
      templateName,
      subject: subject || null
    },
    userId
  );

  return results;
};

module.exports = {
  getNotificationStatus,
  sendCustomerNotifications
};
