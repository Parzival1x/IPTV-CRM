# Twilio WhatsApp Integration Example

This example shows how to integrate Twilio WhatsApp messaging into your existing customer detail page.

## Quick Integration Steps

### 1. Import the Twilio Service and Component

```typescript
// In your CustomerDetail.tsx or any component
import { twilioWhatsAppService } from '../services/twilioWhatsAppService';
import TwilioWhatsAppMessaging from '../components/common/TwilioWhatsAppMessaging';
```

### 2. Add State Management

```typescript
const [showTwilioWhatsApp, setShowTwilioWhatsApp] = useState(false);
```

### 3. Add WhatsApp Button

```typescript
// Add this button alongside your existing buttons
<button
  onClick={() => setShowTwilioWhatsApp(true)}
  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
>
  <span>📱</span>
  WhatsApp (Twilio)
</button>
```

### 4. Add the Modal Component

```typescript
// Add this component at the end of your JSX
<TwilioWhatsAppMessaging
  isOpen={showTwilioWhatsApp}
  onClose={() => setShowTwilioWhatsApp(false)}
  customer={customer}
  onSuccess={() => {
    // Handle success
    console.log('Message sent successfully!');
    // You can add toast notification here
  }}
  onError={(error) => {
    // Handle error
    console.error('Failed to send message:', error);
    // You can add toast notification here
  }}
/>
```

## Complete Example

Here's a complete example of integrating Twilio WhatsApp into a customer detail page:

```typescript
import React, { useState } from 'react';
import { twilioWhatsAppService } from '../services/twilioWhatsAppService';
import TwilioWhatsAppMessaging from '../components/common/TwilioWhatsAppMessaging';

const CustomerDetail: React.FC = () => {
  const [showTwilioWhatsApp, setShowTwilioWhatsApp] = useState(false);
  
  const customer = {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com'
  };

  const handleWhatsAppSuccess = () => {
    console.log('WhatsApp message sent successfully!');
    // Add your success logic here (e.g., toast notification)
  };

  const handleWhatsAppError = (error: string) => {
    console.error('WhatsApp error:', error);
    // Add your error handling here (e.g., toast notification)
  };

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowTwilioWhatsApp(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <span>📱</span>
          Send WhatsApp
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
        <div className="space-y-2">
          <p><strong>Name:</strong> {customer.name}</p>
          <p><strong>Phone:</strong> {customer.phone}</p>
          <p><strong>Email:</strong> {customer.email}</p>
        </div>
      </div>

      <TwilioWhatsAppMessaging
        isOpen={showTwilioWhatsApp}
        onClose={() => setShowTwilioWhatsApp(false)}
        customer={customer}
        onSuccess={handleWhatsAppSuccess}
        onError={handleWhatsAppError}
      />
    </div>
  );
};

export default CustomerDetail;
```

## Direct API Usage

You can also use the Twilio service directly without the modal component:

```typescript
import { twilioWhatsAppService } from '../services/twilioWhatsAppService';

// Send a simple text message
const sendQuickMessage = async () => {
  const result = await twilioWhatsAppService.sendTextMessage(
    '+1234567890',
    'Hello! This is a test message from our admin dashboard.',
    false // Set to true for test mode
  );
  
  if (result.success) {
    console.log('Message sent!', result.messageId);
  } else {
    console.error('Failed to send:', result.error);
  }
};

// Send a template message
const sendWelcomeMessage = async () => {
  const result = await twilioWhatsAppService.sendTemplateMessage(
    '+1234567890',
    'welcome',
    'John Doe',
    {},
    false // Set to true for test mode
  );
  
  if (result.success) {
    console.log('Welcome message sent!', result.messageId);
  } else {
    console.error('Failed to send welcome:', result.error);
  }
};

// Send a payment reminder
const sendPaymentReminder = async () => {
  const result = await twilioWhatsAppService.sendTemplateMessage(
    '+1234567890',
    'payment_reminder',
    'John Doe',
    { amount: 150.00 },
    false
  );
  
  if (result.success) {
    console.log('Payment reminder sent!', result.messageId);
  } else {
    console.error('Failed to send reminder:', result.error);
  }
};
```

## Environment Setup

Make sure your `.env` file contains:

```env
REACT_APP_TWILIO_ACCOUNT_SID=your_account_sid_here
REACT_APP_TWILIO_AUTH_TOKEN=your_auth_token_here
REACT_APP_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Testing

1. Set up Twilio sandbox by texting "join [keyword]" to +1 (415) 523-8886
2. Use test mode in the component to verify integration
3. Send real messages to your verified phone number
4. Check Twilio console for delivery status

## Production Considerations

1. **Replace sandbox number** with your approved WhatsApp Business number
2. **Set up message templates** in Twilio console
3. **Implement proper error handling** and retry logic
4. **Add logging** for message tracking and debugging
5. **Consider rate limiting** to avoid API limits

This integration provides a complete WhatsApp messaging solution using Twilio's reliable API service.
