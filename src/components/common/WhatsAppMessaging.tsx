import { useState } from 'react';
import { Customer } from '../../data/customers';
import { whatsappService, MESSAGE_TEMPLATES, WhatsAppResponse } from '../../services/whatsappService';

interface WhatsAppMessagingProps {
  customer: Customer;
  onClose: () => void;
  onMessageSent: (response: WhatsAppResponse) => void;
}

export default function WhatsAppMessaging({ customer, onClose, onMessageSent }: WhatsAppMessagingProps) {
  const [messageType, setMessageType] = useState<'custom' | 'template'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState(true);

  const handleSendMessage = async () => {
    if (!whatsappService.isValidPhoneNumber(customer.phone)) {
      onMessageSent({
        success: false,
        error: 'Invalid phone number format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    setIsLoading(true);

    try {
      let response: WhatsAppResponse;

      if (messageType === 'template' && selectedTemplate) {
        const template = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplate);
        if (!template) {
          throw new Error('Template not found');
        }

        // Generate template variables based on customer data
        const variables: Record<string, string> = {
          name: customer.name,
          amount: customer.amount,
          date: customer.expiryDate,
          box: customer.box,
          credits: customer.remainingCredits
        };

        const message = whatsappService.generateMessageFromTemplate(selectedTemplate, variables);
        
        if (testMode) {
          // Simulate API call in test mode
          response = {
            success: true,
            messageId: `test_${Date.now()}`,
            timestamp: new Date().toISOString()
          };
        } else {
          response = await whatsappService.sendTextMessage(customer.phone, message);
        }
      } else if (messageType === 'custom' && customMessage.trim()) {
        if (testMode) {
          // Simulate API call in test mode
          response = {
            success: true,
            messageId: `test_${Date.now()}`,
            timestamp: new Date().toISOString()
          };
        } else {
          response = await whatsappService.sendTextMessage(customer.phone, customMessage);
        }
      } else {
        response = {
          success: false,
          error: 'Please select a template or enter a custom message',
          timestamp: new Date().toISOString()
        };
      }

      onMessageSent(response);
      
      if (response.success) {
        onClose();
      }
    } catch (error) {
      onMessageSent({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplatePreview = () => {
    if (!selectedTemplate) return '';
    
    const template = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return '';

    const variables: Record<string, string> = {
      name: customer.name,
      amount: customer.amount,
      date: customer.expiryDate,
      box: customer.box,
      credits: customer.remainingCredits
    };

    return whatsappService.generateMessageFromTemplate(selectedTemplate, variables);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Send WhatsApp Message
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Customer Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{customer.avatar}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
            </div>
          </div>
        </div>

        {/* Test Mode Toggle */}
        <div className="mb-4 flex items-center space-x-2">
          <input
            type="checkbox"
            id="testMode"
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="testMode" className="text-sm text-gray-700 dark:text-gray-300">
            Test Mode (Don't actually send)
          </label>
        </div>

        {/* Message Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMessageType('template')}
              className={`p-2 rounded-lg border ${
                messageType === 'template'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Template
            </button>
            <button
              onClick={() => setMessageType('custom')}
              className={`p-2 rounded-lg border ${
                messageType === 'custom'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Template Selection */}
        {messageType === 'template' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose a template...</option>
              {MESSAGE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            
            {/* Template Preview */}
            {selectedTemplate && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{getTemplatePreview()}</p>
              </div>
            )}
          </div>
        )}

        {/* Custom Message */}
        {messageType === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Message
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {customMessage.length}/1000 characters
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendMessage}
            disabled={
              isLoading ||
              (messageType === 'template' && !selectedTemplate) ||
              (messageType === 'custom' && !customMessage.trim())
            }
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {testMode ? 'Test Send' : 'Send Message'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
