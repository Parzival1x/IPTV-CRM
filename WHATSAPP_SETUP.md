# WhatsApp API Integration Setup Guide

This guide will help you set up WhatsApp Business API integration for sending messages to customers. You can choose between two options:

1. **Direct Facebook/Meta WhatsApp Business API** - More complex setup but lower costs
2. **Twilio WhatsApp API** - Simpler setup but higher costs per message

## Option 1: Direct Facebook/Meta WhatsApp Business API

### Prerequisites

1. **WhatsApp Business Account**: You need a verified WhatsApp Business account
2. **Facebook Developer Account**: Create an account at [developers.facebook.com](https://developers.facebook.com)
3. **Facebook App**: Create a Facebook app with WhatsApp Business API access

### Setup Steps

#### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click "Create App" and choose "Business"
3. Enter your app name and contact email
4. Add the WhatsApp product to your app

#### 2. Get API Credentials

1. In your Facebook app dashboard, go to WhatsApp > API Setup
2. Copy the following values:
   - **Phone Number ID**: Your WhatsApp Business phone number ID
   - **Access Token**: Temporary access token (24 hours)
   - **App ID**: Your Facebook app ID

#### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Facebook credentials:
   ```env
   REACT_APP_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
   REACT_APP_WHATSAPP_ACCESS_TOKEN=your_access_token_here
   REACT_APP_FACEBOOK_APP_ID=your_app_id_here
   ```

## Option 2: Twilio WhatsApp API (Recommended for Beginners)

### Prerequisites

1. **Twilio Account**: Create a free account at [twilio.com](https://www.twilio.com)
2. **Phone Number Verification**: Verify your phone number with Twilio
3. **WhatsApp Sandbox**: Use Twilio's WhatsApp sandbox for testing

### Setup Steps

#### 1. Create Twilio Account

1. Sign up at [Twilio Console](https://console.twilio.com)
2. Complete account verification
3. Get your Account SID and Auth Token from the dashboard

#### 2. Set Up WhatsApp Sandbox

1. In Twilio Console, go to Messaging > Try it out > Send a WhatsApp message
2. Follow the instructions to join the WhatsApp sandbox
3. Send "join [your-sandbox-keyword]" to the sandbox number
4. Note down the sandbox WhatsApp number (e.g., whatsapp:+14155238886)

#### 3. Configure Environment Variables

Update your `.env` file with Twilio credentials:
```env
REACT_APP_TWILIO_ACCOUNT_SID=your_account_sid_here
REACT_APP_TWILIO_AUTH_TOKEN=your_auth_token_here
REACT_APP_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

#### 4. Test the Integration

1. Use the Twilio WhatsApp messaging component in your app
2. Send test messages to your verified phone number
3. Messages will come from the Twilio sandbox number

### Production Setup for Twilio

For production use with Twilio:

1. **Request Production Access**: Apply for WhatsApp Business API access
2. **Get Approved WhatsApp Number**: Purchase and verify a dedicated WhatsApp number
3. **Template Approval**: Submit message templates for approval
4. **Update Environment**: Replace sandbox number with your production number

## Usage

### Option 1: Using Facebook/Meta WhatsApp Service

```javascript
import { whatsappService } from './services/whatsappService';
import WhatsAppMessaging from './components/common/WhatsAppMessaging';

// Use the original WhatsApp component
<WhatsAppMessaging 
  customer={customer} 
  isOpen={showModal} 
  onClose={() => setShowModal(false)} 
/>
```

### Option 2: Using Twilio WhatsApp Service

```javascript
import { twilioWhatsAppService } from './services/twilioWhatsAppService';
import TwilioWhatsAppMessaging from './components/common/TwilioWhatsAppMessaging';

// Use the Twilio WhatsApp component
<TwilioWhatsAppMessaging 
  customer={customer} 
  isOpen={showModal} 
  onClose={() => setShowModal(false)} 
/>
```

## Comparison: Facebook/Meta vs Twilio

| Feature | Facebook/Meta API | Twilio API |
|---------|------------------|------------|
| **Setup Complexity** | High | Low |
| **Cost** | Lower (free tier available) | Higher ($0.005-0.02 per message) |
| **Message Templates** | Must be pre-approved | More flexible |
| **Phone Number** | Own WhatsApp Business number | Twilio-managed number |
| **Support** | Facebook developer support | Twilio support |
| **Production Ready** | Requires business verification | Faster to production |

## Recommended Choice

- **For Development/Testing**: Use Twilio (easier setup, quick testing)
- **For Production/Scale**: Use Facebook/Meta (lower costs, more control)

### 4. Verify Phone Number

1. In Facebook Developer Console, go to WhatsApp > API Setup
2. Add and verify your WhatsApp Business phone number
3. Make sure the number is approved for sending messages

### 5. Test the Integration

1. Use the test mode toggle in the WhatsApp messaging component
2. Send test messages to verify the integration works
3. Check the browser console for any API errors

## Usage

### From Customer Detail Page

1. Navigate to any customer detail page
2. Click the "WhatsApp" button next to "Edit Customer"
3. Choose between:
   - **Template Messages**: Pre-configured messages with customer data
   - **Custom Messages**: Write your own message

### From Dashboard

1. Go to the dashboard
2. In the "Recent Customer Activity" table
3. Click the "Message" button for any customer

### Available Message Templates

- **Welcome Message**: Welcome new customers
- **Payment Reminder**: Remind customers about due payments
- **Service Activation**: Notify about service activation
- **Credit Update**: Inform about credit balance changes
- **Support Message**: General support communication
- **Order Confirmation**: Confirm customer orders
- **Service Expiry**: Notify about service expiration

## API Rate Limits

- **Messaging Rate**: 250 messages per minute per phone number
- **Monthly Limit**: 1000 free messages per month (then paid)
- **Daily Limit**: 24-hour messaging window after customer replies

## Production Considerations

### 1. Access Token Management

- Temporary tokens expire in 24 hours
- Use permanent access tokens for production
- Implement token refresh mechanism

### 2. Webhook Setup

```javascript
// Add webhook endpoint to receive message status updates
app.post('/webhook', (req, res) => {
  const body = req.body;
  
  if (body.entry && body.entry[0].changes) {
    // Process webhook data
    console.log('WhatsApp webhook received:', body);
  }
  
  res.status(200).send('OK');
});
```

### 3. Message Templates

For production, you'll need to:
1. Create approved message templates in Facebook Business Manager
2. Submit templates for WhatsApp approval
3. Use only approved templates for outbound messages

### 4. Error Handling

```javascript
// Enhanced error handling
try {
  const response = await whatsappService.sendTextMessage(phone, message);
  if (!response.success) {
    // Log error and show user-friendly message
    console.error('WhatsApp error:', response.error);
    // Implement retry logic or fallback
  }
} catch (error) {
  // Handle network errors, API downtime, etc.
  console.error('Network error:', error);
}
```

## Security Best Practices

1. **Environment Variables**: Never commit API keys to version control
2. **Token Security**: Rotate access tokens regularly
3. **Phone Validation**: Always validate phone numbers before sending
4. **Rate Limiting**: Implement client-side rate limiting
5. **Audit Logging**: Log all message sending attempts

## Troubleshooting

### Common Issues

1. **Invalid Phone Number**: Ensure phone numbers include country code
2. **Authentication Error**: Check access token validity
3. **Rate Limit Exceeded**: Implement message queuing
4. **Template Not Found**: Verify template names and approval status

### Debug Mode

Enable debug mode by setting:
```env
REACT_APP_DEBUG_WHATSAPP=true
```

This will log all API requests and responses to the console.

## Cost Considerations

- **Free Tier**: 1000 conversations per month
- **Paid Tier**: Variable pricing based on country and message type
- **Template Messages**: Lower cost than session messages
- **Session Messages**: Higher cost but more flexible

## Support

For additional help:
1. Check [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
2. Visit [Facebook Developer Support](https://developers.facebook.com/support)
3. Review the console logs for detailed error messages
