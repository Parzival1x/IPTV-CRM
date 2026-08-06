const crypto = require('crypto');
const express = require('express');
const logger = require('../config/logger');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Meta sends a status callback for every WhatsApp message -- sent, delivered,
// read, or failed. Nothing received them before, which is why
// `whatsapp_messages.delivered_at` and the `delivered` status existed in the
// schema from day one and were never written: there was no way to tell a
// message the API accepted from one that actually arrived.
//
// This endpoint is public by necessity, so it authenticates two ways:
//
//   GET  -- the one-time subscription handshake, which echoes a challenge only
//           if the verify token matches.
//   POST -- an HMAC-SHA256 signature over the raw body, keyed with the app
//           secret. Without checking it, anyone who learns the URL can mark
//           any message delivered.

const verifySignature = (req) => {
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appSecret) {
    // Refuse rather than accept unsigned callbacks. An unauthenticated writer
    // into the message log is not an acceptable default.
    logger.warn('WhatsApp webhook received but FACEBOOK_APP_SECRET is not configured');
    return false;
  }

  const signature = req.get('x-hub-signature-256') || '';
  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody || Buffer.alloc(0))
    .digest('hex')}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  // timingSafeEqual throws on a length mismatch, which is itself a signal, so
  // check length first and compare in constant time only when it can match.
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

router.get('/whatsapp', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return res.status(503).send('Webhook verification is not configured.');
  }

  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === verifyToken
  ) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }

  return res.sendStatus(403);
});

router.post('/whatsapp', async (req, res) => {
  if (!verifySignature(req)) {
    logger.warn('Rejected a WhatsApp webhook with an invalid signature', { ip: req.ip });
    return res.sendStatus(401);
  }

  // Acknowledge immediately. Meta retries with backoff on anything that is not
  // a prompt 200, and a slow database write here turns into duplicate
  // callbacks rather than a useful error.
  res.sendStatus(200);

  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        for (const status of change.value?.statuses || []) {
          const updated = await notificationService.recordWhatsAppDeliveryStatus({
            providerMessageId: status.id,
            status: status.status,
            errorMessage: status.errors?.[0]?.title || null
          });

          if (!updated) {
            // A status for a message this system did not send -- another app
            // sharing the number, or a message predating the log.
            logger.debug('WhatsApp status for an unknown message', { providerMessageId: status.id });
          }
        }
      }
    }
  } catch (error) {
    logger.error('Failed to process a WhatsApp webhook', { error });
  }
});

module.exports = router;
