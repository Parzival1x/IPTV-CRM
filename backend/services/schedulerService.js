const cron = require('node-cron');
const { scheduler } = require('../config/runtime');
const logger = require('../config/logger');
const customerRepository = require('../repositories/customerRepository');
const auditRepository = require('../repositories/auditRepository');
const notificationService = require('./notificationService');

// The application had nothing that ran on a schedule.
//
// Two consequences followed from that. Subscriptions were never marked
// expired, so `customer_subscriptions.status` stayed `active` forever and the
// dashboard, the customer list and the customer portal all read a stale value.
// And the renewal and payment-due templates seeded into `whatsapp_templates`
// by the very first migration were read by no code path at all -- every
// notification was sent by hand, one customer at a time, which for a
// subscription business is the product rather than a nicety.
//
// This runs both: sweep the expiries, then send reminders for everything
// approaching one.

let task = null;
let running = false;
let lastRun = null;

const runExpirySweep = async () => {
  const expired = await customerRepository.expireLapsedSubscriptions();

  if (expired > 0) {
    logger.info('Expired lapsed subscriptions', { count: expired });
    await auditRepository.record({
      action: 'scheduler_expired_subscriptions',
      entityType: 'subscription',
      metadata: { count: expired }
    });
  }

  return expired;
};

const sendRenewalReminders = async () => {
  const channels = scheduler.reminderChannels;
  const summary = { sent: 0, failed: 0, skipped: 0, byDay: {} };

  if (channels.length === 0) {
    logger.warn('Renewal reminders are enabled but no channels are configured');
    return summary;
  }

  let budget = scheduler.maxRemindersPerRun;

  for (const days of scheduler.reminderDays) {
    if (budget <= 0) {
      // A cap exists so a misconfiguration cannot fan out to the entire
      // customer base in one run. Say so rather than looking like there was
      // nothing to send.
      logger.warn('Reminder budget exhausted for this run', {
        maxRemindersPerRun: scheduler.maxRemindersPerRun,
        remainingDayBuckets: scheduler.reminderDays.filter((value) => value < days)
      });
      break;
    }

    const due = await customerRepository.getSubscriptionsExpiringIn(days, {
      channels,
      limit: Math.min(budget, 500)
    });

    summary.byDay[days] = due.length;

    for (const row of due) {
      budget -= 1;

      // Claim the reminder BEFORE sending. If the send then fails, the
      // customer misses one reminder; if it were the other way round, a crash
      // between sending and recording would send the same reminder again on
      // the next run.
      const claimed = await customerRepository.markReminderSent({
        subscriptionId: row.subscription_id,
        customerId: row.customer_id,
        kind: `expiring_${days}_days`,
        expiryDate: row.expiry_date,
        channels
      });

      if (!claimed) {
        summary.skipped += 1;
        continue;
      }

      try {
        const customer = await customerRepository.getById(row.customer_id);

        if (!customer) {
          summary.skipped += 1;
          continue;
        }

        await notificationService.sendCustomerNotifications({
          customer,
          channels,
          templateName: 'renewal_reminder',
          metadata: {
            serviceName: row.service_label || row.plan_name || 'your service',
            expiryDate: String(row.expiry_date).slice(0, 10),
            amount: row.outstanding_amount || row.amount,
            currency: row.currency,
            daysUntilExpiry: days
          }
        });

        summary.sent += 1;
      } catch (error) {
        summary.failed += 1;
        logger.warn('Renewal reminder failed', {
          customerId: row.customer_id,
          subscriptionId: row.subscription_id,
          days,
          error
        });
      }
    }
  }

  return summary;
};

const runOnce = async ({ trigger = 'schedule' } = {}) => {
  if (running) {
    logger.warn('Scheduler run skipped because the previous run is still going');
    return { skipped: true };
  }

  running = true;
  const startedAt = Date.now();

  try {
    const expired = await runExpirySweep();
    const reminders = await sendRenewalReminders();
    const result = {
      trigger,
      expiredSubscriptions: expired,
      reminders,
      durationMs: Date.now() - startedAt
    };

    lastRun = { ...result, at: new Date().toISOString(), ok: true };
    logger.info('Scheduler run complete', result);

    await auditRepository.record({
      action: 'scheduler_run',
      entityType: 'scheduler',
      metadata: result
    });

    return result;
  } catch (error) {
    lastRun = { trigger, at: new Date().toISOString(), ok: false, error: error.message };
    logger.error('Scheduler run failed', { trigger, error });
    throw error;
  } finally {
    running = false;
  }
};

const start = () => {
  if (!scheduler.enabled) {
    logger.info('Scheduler disabled', { hint: 'Set SCHEDULER_ENABLED=true to turn it on.' });
    return null;
  }

  if (!cron.validate(scheduler.cron)) {
    logger.error('Scheduler not started: SCHEDULER_CRON is not a valid cron expression', {
      cron: scheduler.cron
    });
    return null;
  }

  task = cron.schedule(
    scheduler.cron,
    () => {
      runOnce({ trigger: 'schedule' }).catch(() => {
        // runOnce already logged it. Swallow here so an unhandled rejection
        // does not take the process down and stop every future run.
      });
    },
    { timezone: scheduler.timezone }
  );

  logger.info('Scheduler started', {
    cron: scheduler.cron,
    timezone: scheduler.timezone,
    reminderDays: scheduler.reminderDays,
    channels: scheduler.reminderChannels
  });

  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

const getStatus = () => ({
  enabled: scheduler.enabled,
  running,
  cron: scheduler.cron,
  timezone: scheduler.timezone,
  reminderDays: scheduler.reminderDays,
  channels: scheduler.reminderChannels,
  maxRemindersPerRun: scheduler.maxRemindersPerRun,
  lastRun
});

module.exports = {
  start,
  stop,
  runOnce,
  getStatus
};
