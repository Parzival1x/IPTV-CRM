import { useState, useEffect } from 'react';
import { twilioWhatsAppService, TWILIO_MESSAGE_TEMPLATES } from '../../services/twilioWhatsAppService';

interface TwilioWhatsAppMessagingProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const TwilioWhatsAppMessaging: React.FC<TwilioWhatsAppMessagingProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
  onError
}) => {
  const [messageType, setMessageType] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TWILIO_MESSAGE_TEMPLATES>('welcome');
  const [customMessage, setCustomMessage] = useState('');
  const [additionalData, setAdditionalData] = useState<any>({});
  const [isTestMode, setIsTestMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // Test connection when component mounts
  useEffect(() => {
    if (isOpen) {
      testConnection();
    }
  }, [isOpen]);

  const testConnection = async () => {
    try {
      const result = await twilioWhatsAppService.testConnection();
      setConnectionStatus(result.success ? 'connected' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const getTemplatePreview = () => {
    switch (selectedTemplate) {
      case 'welcome':
        return TWILIO_MESSAGE_TEMPLATES.welcome(customer.name);
      case 'payment_reminder':
        return TWILIO_MESSAGE_TEMPLATES.payment_reminder(customer.name, additionalData.amount || 100);
      case 'service_activation':
        return TWILIO_MESSAGE_TEMPLATES.service_activation(customer.name, additionalData.serviceName || 'Premium Service');
      case 'credit_update':
        return TWILIO_MESSAGE_TEMPLATES.credit_update(customer.name, additionalData.creditAmount || 50);
      case 'support_message':
        return TWILIO_MESSAGE_TEMPLATES.support_message(customer.name);
      case 'order_confirmation':
        return TWILIO_MESSAGE_TEMPLATES.order_confirmation(customer.name, additionalData.orderId || 'ORD123');
      case 'service_expiry':
        return TWILIO_MESSAGE_TEMPLATES.service_expiry(customer.name, additionalData.serviceName || 'Premium Service', additionalData.expiryDate || '2025-08-12');
      default:
        return '';
    }
  };

  const handleSendMessage = async () => {
    if (!customer.phone) {
      onError?.('Customer phone number is required');
      return;
    }

    setIsLoading(true);
    
    try {
      let result;
      
      if (messageType === 'template') {
        result = await twilioWhatsAppService.sendTemplateMessage(
          customer.phone,
          selectedTemplate,
          customer.name,
          additionalData,
          isTestMode
        );
      } else {
        if (!customMessage.trim()) {
          onError?.('Message cannot be empty');
          setIsLoading(false);
          return;
        }
        
        result = await twilioWhatsAppService.sendTextMessage(
          customer.phone,
          customMessage,
          isTestMode
        );
      }

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        onError?.(result.error || 'Failed to send message');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Send WhatsApp Message via Twilio
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              To: {customer.name} ({customer.phone})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-lg">×</span>
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' ? 'Connected to Twilio' : 
                 connectionStatus === 'error' ? 'Connection Error' : 'Checking...'}
              </span>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isTestMode}
                onChange={(e) => setIsTestMode(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">Test Mode</span>
            </label>
          </div>
        </div>

        {/* Message Type Selection */}
        <div className="p-6 border-b">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setMessageType('template')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                messageType === 'template'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Template Message
            </button>
            <button
              onClick={() => setMessageType('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                messageType === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Message
            </button>
          </div>

          {messageType === 'template' ? (
            <div className="space-y-4">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as keyof typeof TWILIO_MESSAGE_TEMPLATES)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="welcome">Welcome Message</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="service_activation">Service Activation</option>
                  <option value="credit_update">Credit Update</option>
                  <option value="support_message">Support Message</option>
                  <option value="order_confirmation">Order Confirmation</option>
                  <option value="service_expiry">Service Expiry</option>
                </select>
              </div>

              {/* Template-specific fields */}
              {selectedTemplate === 'payment_reminder' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    value={additionalData.amount || ''}
                    onChange={(e) => setAdditionalData({...additionalData, amount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter amount"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {(selectedTemplate === 'service_activation' || selectedTemplate === 'service_expiry') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={additionalData.serviceName || ''}
                    onChange={(e) => setAdditionalData({...additionalData, serviceName: e.target.value})}
                    placeholder="Enter service name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedTemplate === 'credit_update' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Amount ($)
                  </label>
                  <input
                    type="number"
                    value={additionalData.creditAmount || ''}
                    onChange={(e) => setAdditionalData({...additionalData, creditAmount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter credit amount"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedTemplate === 'order_confirmation' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order ID
                  </label>
                  <input
                    type="text"
                    value={additionalData.orderId || ''}
                    onChange={(e) => setAdditionalData({...additionalData, orderId: e.target.value})}
                    placeholder="Enter order ID"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedTemplate === 'service_expiry' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={additionalData.expiryDate || ''}
                    onChange={(e) => setAdditionalData({...additionalData, expiryDate: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Template Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Preview
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {getTemplatePreview()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={`Write your message to ${customer.name}...`}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                Characters: {customMessage.length}/1600
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50">
          <div className="text-sm text-gray-600">
            {isTestMode ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Test mode - No actual message will be sent
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Production mode - Message will be sent via Twilio
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || connectionStatus === 'error'}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioWhatsAppMessaging;
