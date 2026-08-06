import { useEffect, useMemo, useState } from 'react';
import { notificationsAPI } from '../../services/api';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    whatsappNumber?: string;
    email: string;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type NotificationTemplate = 'welcome' | 'payment_due' | 'renewal_reminder' | 'custom';
type NotificationChannel = 'whatsapp' | 'email';

type NotificationStatusResponse = {
  success: boolean;
  status?: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
    emailSender?: string;
    smtpHost?: string;
    emailMissing?: string[];
    whatsappMissing?: string[];
  };
};

const templateDescriptions: Record<NotificationTemplate, string> = {
  welcome: 'Send onboarding details and generated customer references.',
  payment_due: 'Send a due-payment reminder with the current amount.',
  renewal_reminder: 'Send a reminder before subscription expiry.',
  custom: 'Write your own custom message for this customer.'
};

const TwilioWhatsAppMessaging = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
  onError
}: NotificationModalProps) => {
  const [channel, setChannel] = useState<NotificationChannel>('whatsapp');
  const [templateName, setTemplateName] = useState<NotificationTemplate>('welcome');
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('Message from StreamOps IPTV');
  const [amount, setAmount] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<NonNullable<NotificationStatusResponse['status']>>({
    emailConfigured: false,
    whatsappConfigured: false,
    emailSender: '',
    smtpHost: '',
    emailMissing: [],
    whatsappMissing: []
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    notificationsAPI
      .getStatus()
      .then((response) => {
        const payload = response as NotificationStatusResponse;
        if (payload.success && payload.status) {
          setStatus(payload.status);
          if (!payload.status.whatsappConfigured && payload.status.emailConfigured) {
            setChannel('email');
          }
        }
      })
      .catch((error) => {
        onError?.(error instanceof Error ? error.message : 'Unable to load notification status.');
      });
  }, [isOpen, onError]);

  const channelAvailability = useMemo(
    () => ({
      whatsapp: status.whatsappConfigured && Boolean(customer.whatsappNumber || customer.phone),
      email: status.emailConfigured && Boolean(customer.email)
    }),
    [
      customer.email,
      customer.phone,
      customer.whatsappNumber,
      status.emailConfigured,
      status.whatsappConfigured
    ]
  );

  const emailStatusText = useMemo(() => {
    if (!customer.email) {
      return 'Customer email missing';
    }

    if (!status.emailConfigured) {
      const missing = status.emailMissing || [];
      return missing.length > 0 ? `Missing ${missing.join(', ')}` : 'Not configured';
    }

    return status.emailConfigured
      ? `Configured${status.emailSender ? ` as ${status.emailSender}` : ''}`
      : 'Not configured';
  }, [customer.email, status]);

  const whatsappStatusText = useMemo(() => {
    if (!(customer.whatsappNumber || customer.phone)) {
      return 'Customer number missing';
    }

    if (!status.whatsappConfigured) {
      const missing = status.whatsappMissing || [];
      return missing.length > 0 ? `Missing ${missing.join(', ')}` : 'Not configured';
    }

    return 'Configured on backend';
  }, [customer.phone, customer.whatsappNumber, status]);

  const handleSend = async () => {
    if (templateName === 'custom' && !customMessage.trim()) {
      onError?.('Please enter a custom message before sending.');
      return;
    }

    if (!channelAvailability[channel]) {
      onError?.(`The selected ${channel} channel is not available for this customer.`);
      return;
    }

    setIsLoading(true);

    try {
      await notificationsAPI.send({
        customerId: customer.id,
        channels: [channel],
        templateName,
        subject,
        metadata: {
          amount,
          serviceName,
          dueDate,
          expiryDate,
          message: customMessage
        }
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unable to send notification.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Send Customer Notification</h2>
              <p className="mt-1 text-sm text-gray-500">
                {customer.name} | {customer.email || customer.whatsappNumber || customer.phone}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              x
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              disabled={!channelAvailability.whatsapp}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                channel === 'whatsapp'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-white text-gray-700'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="text-sm font-semibold">WhatsApp</div>
              <div className="mt-1 text-sm text-gray-500">
                {whatsappStatusText}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setChannel('email')}
              disabled={!channelAvailability.email}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                channel === 'email'
                  ? 'border-sky-500 bg-sky-50 text-sky-800'
                  : 'border-gray-200 bg-white text-gray-700'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="text-sm font-semibold">Email</div>
              <div className="mt-1 text-sm text-gray-500">
                {emailStatusText}
              </div>
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Template</label>
            <select
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value as NotificationTemplate)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="welcome">Welcome</option>
              <option value="payment_due">Payment Due</option>
              <option value="renewal_reminder">Renewal Reminder</option>
              <option value="custom">Custom Message</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">{templateDescriptions[templateName]}</p>
          </div>

          {channel === 'email' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : null}

          {templateName === 'payment_due' || templateName === 'renewal_reminder' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {templateName === 'payment_due' ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="text"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="$99.00"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Service Name</label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(event) => setServiceName(event.target.value)}
                      placeholder="IPTV Premium Package"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          ) : null}

          {templateName === 'custom' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Custom Message</label>
              <textarea
                value={customMessage}
                onChange={(event) => setCustomMessage(event.target.value)}
                rows={6}
                placeholder="Write the message you want to send to this customer."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-500">
            The message will be sent from the backend and logged against this customer.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoading ? 'Sending...' : `Send via ${channel === 'email' ? 'Email' : 'WhatsApp'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioWhatsAppMessaging;
