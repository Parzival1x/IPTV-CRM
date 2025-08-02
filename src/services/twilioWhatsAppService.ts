// Twilio WhatsApp message templates
export const TWILIO_MESSAGE_TEMPLATES = {
  welcome: (customerName: string) => 
    `Hello ${customerName}! Welcome to our service. We're excited to have you on board! 🎉`,
  
  payment_reminder: (customerName: string, amount: number) => 
    `Hi ${customerName}, this is a friendly reminder that you have a payment of $${amount} due. Please make your payment at your earliest convenience.`,
  
  service_activation: (customerName: string, serviceName: string) => 
    `Great news ${customerName}! Your ${serviceName} service has been activated successfully. You can start using it right away.`,
  
  credit_update: (customerName: string, creditAmount: number) => 
    `Hi ${customerName}, your account has been credited with $${creditAmount}. Your new balance is updated.`,
  
  support_message: (customerName: string) => 
    `Hi ${customerName}, our support team is here to help you. How can we assist you today?`,
  
  order_confirmation: (customerName: string, orderId: string) => 
    `Hi ${customerName}, your order #${orderId} has been confirmed and is being processed. Thank you for your business!`,
  
  service_expiry: (customerName: string, serviceName: string, expiryDate: string) => 
    `Hi ${customerName}, your ${serviceName} service will expire on ${expiryDate}. Please renew to continue enjoying our services.`
};

interface TwilioWhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export class TwilioWhatsAppService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = import.meta.env.REACT_APP_TWILIO_ACCOUNT_SID || '';
    this.authToken = import.meta.env.REACT_APP_TWILIO_AUTH_TOKEN || '';
    this.fromNumber = import.meta.env.REACT_APP_TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
  }

  // Validate phone number format for WhatsApp
  private validatePhoneNumber(phoneNumber: string): string | null {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (7-15 digits)
    if (cleaned.length < 7 || cleaned.length > 15) {
      return null;
    }
    
    // Add country code if missing (assuming US +1 if 10 digits)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // Add + if missing
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  // Send a text message via Twilio WhatsApp
  async sendTextMessage(
    phoneNumber: string, 
    message: string, 
    testMode: boolean = false
  ): Promise<TwilioWhatsAppResponse> {
    try {
      console.log('🚀 Twilio WhatsApp Service - Starting message send');
      console.log('📱 Phone:', phoneNumber);
      console.log('💬 Message:', message);
      console.log('🧪 Test Mode:', testMode);
      
      // Debug environment variables
      console.log('🔧 Configuration:');
      console.log('  Account SID:', this.accountSid ? `${this.accountSid.substring(0, 10)}...` : 'Not set');
      console.log('  Auth Token:', this.authToken ? 'Set (hidden)' : 'Not set');
      console.log('  From Number:', this.fromNumber);
      
      const validatedPhone = this.validatePhoneNumber(phoneNumber);
      
      if (!validatedPhone) {
        console.error('❌ Invalid phone number:', phoneNumber);
        return {
          success: false,
          error: 'Invalid phone number format. Please include country code (e.g., +1234567890)'
        };
      }

      console.log('✅ Phone validated:', validatedPhone);

      if (testMode) {
        console.log('🧪 TWILIO WHATSAPP TEST MODE');
        console.log('📱 To:', validatedPhone);
        console.log('💬 Message:', message);
        console.log('🔗 From:', this.fromNumber);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          messageId: `test_${Date.now()}`,
          details: { testMode: true, validatedPhone, fromNumber: this.fromNumber }
        };
      }

      // Check if credentials are available
      if (!this.accountSid || !this.authToken) {
        console.error('❌ Twilio credentials missing');
        console.error('  Account SID present:', !!this.accountSid);
        console.error('  Auth Token present:', !!this.authToken);
        
        return {
          success: false,
          error: 'Twilio credentials not configured. Please check your .env file.'
        };
      }

      console.log('📡 Making API request to Twilio...');

      // Prepare the request body
      const formData = new URLSearchParams();
      formData.append('To', `whatsapp:${validatedPhone}`);
      formData.append('From', this.fromNumber);
      formData.append('Body', message);

      console.log('📤 Request details:');
      console.log('  URL:', this.baseUrl);
      console.log('  To:', `whatsapp:${validatedPhone}`);
      console.log('  From:', this.fromNumber);
      console.log('  Body length:', message.length);

      // Create authorization header
      const credentials = btoa(`${this.accountSid}:${this.authToken}`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      console.log('📥 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📄 Response data:', data);

      if (response.ok) {
        console.log('✅ Twilio WhatsApp message sent successfully:', data);
        return {
          success: true,
          messageId: data.sid,
          details: data
        };
      } else {
        console.error('❌ Twilio WhatsApp API error:', data);
        
        // Enhanced error messages
        let errorMessage = data.message || 'Failed to send message';
        if (data.code) {
          errorMessage += ` (Error ${data.code})`;
        }
        
        // Specific error handling
        if (data.code === 21610) {
          errorMessage = 'Phone number not verified with Twilio sandbox. Please join the sandbox first.';
        } else if (data.code === 20003) {
          errorMessage = 'Invalid Twilio credentials. Please check your Account SID and Auth Token.';
        } else if (data.code === 21408) {
          errorMessage = 'Invalid phone number format or unsupported country.';
        }
        
        return {
          success: false,
          error: errorMessage,
          details: data
        };
      }

    } catch (error) {
      console.error('❌ Twilio WhatsApp service error:', error);
      
      // Network error handling
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error: Unable to connect to Twilio. Please check your internet connection.'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Send a template message
  async sendTemplateMessage(
    phoneNumber: string,
    templateKey: keyof typeof TWILIO_MESSAGE_TEMPLATES,
    customerName: string,
    additionalData?: any,
    testMode: boolean = false
  ): Promise<TwilioWhatsAppResponse> {
    try {
      let message: string;

      switch (templateKey) {
        case 'welcome':
          message = TWILIO_MESSAGE_TEMPLATES.welcome(customerName);
          break;
        case 'payment_reminder':
          message = TWILIO_MESSAGE_TEMPLATES.payment_reminder(customerName, additionalData?.amount || 0);
          break;
        case 'service_activation':
          message = TWILIO_MESSAGE_TEMPLATES.service_activation(customerName, additionalData?.serviceName || 'Service');
          break;
        case 'credit_update':
          message = TWILIO_MESSAGE_TEMPLATES.credit_update(customerName, additionalData?.creditAmount || 0);
          break;
        case 'support_message':
          message = TWILIO_MESSAGE_TEMPLATES.support_message(customerName);
          break;
        case 'order_confirmation':
          message = TWILIO_MESSAGE_TEMPLATES.order_confirmation(customerName, additionalData?.orderId || 'N/A');
          break;
        case 'service_expiry':
          message = TWILIO_MESSAGE_TEMPLATES.service_expiry(customerName, additionalData?.serviceName || 'Service', additionalData?.expiryDate || 'Soon');
          break;
        default:
          return {
            success: false,
            error: 'Template not found'
          };
      }

      return await this.sendTextMessage(phoneNumber, message, testMode);

    } catch (error) {
      console.error('❌ Template message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template processing failed'
      };
    }
  }

  // Test connection to Twilio
  async testConnection(): Promise<TwilioWhatsAppResponse> {
    try {
      if (!this.accountSid || !this.authToken) {
        return {
          success: false,
          error: 'Twilio credentials not configured'
        };
      }

      // Test with a simple API call to verify credentials
      const credentials = btoa(`${this.accountSid}:${this.authToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          details: { message: 'Twilio connection successful' }
        };
      } else {
        return {
          success: false,
          error: 'Invalid Twilio credentials'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  // Get account information
  async getAccountInfo(): Promise<any> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const credentials = btoa(`${this.accountSid}:${this.authToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          account: {
            sid: data.sid,
            friendlyName: data.friendly_name,
            status: data.status,
            type: data.type
          }
        };
      } else {
        throw new Error('Failed to fetch account info');
      }

    } catch (error) {
      console.error('❌ Account info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account info'
      };
    }
  }

  // Send message with media (images, documents)
  async sendMediaMessage(
    phoneNumber: string,
    message: string,
    mediaUrl: string,
    testMode: boolean = false
  ): Promise<TwilioWhatsAppResponse> {
    try {
      const validatedPhone = this.validatePhoneNumber(phoneNumber);
      
      if (!validatedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      if (testMode) {
        console.log('🧪 TWILIO WHATSAPP MEDIA TEST MODE');
        console.log('📱 To:', validatedPhone);
        console.log('💬 Message:', message);
        console.log('📎 Media URL:', mediaUrl);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          messageId: `test_media_${Date.now()}`,
          details: { testMode: true, mediaUrl }
        };
      }

      if (!this.accountSid || !this.authToken) {
        return {
          success: false,
          error: 'Twilio credentials not configured'
        };
      }

      const formData = new URLSearchParams();
      formData.append('To', `whatsapp:${validatedPhone}`);
      formData.append('From', this.fromNumber);
      formData.append('Body', message);
      formData.append('MediaUrl', mediaUrl);

      const credentials = btoa(`${this.accountSid}:${this.authToken}`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Twilio WhatsApp media message sent successfully:', data);
        return {
          success: true,
          messageId: data.sid,
          details: data
        };
      } else {
        console.error('❌ Twilio WhatsApp media API error:', data);
        return {
          success: false,
          error: data.message || 'Failed to send media message',
          details: data
        };
      }

    } catch (error) {
      console.error('❌ Twilio WhatsApp media service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const twilioWhatsAppService = new TwilioWhatsAppService();
