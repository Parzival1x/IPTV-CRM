// WhatsApp API Service
export interface WhatsAppMessage {
  to: string;
  message: string;
  type: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

// Predefined message templates
export const MESSAGE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    content: 'Welcome to our service, {{name}}! Your account is now active.',
    variables: ['name']
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    content: 'Hi {{name}}, your payment of {{amount}} is due on {{date}}. Please complete your payment to continue service.',
    variables: ['name', 'amount', 'date']
  },
  {
    id: 'service_activation',
    name: 'Service Activation',
    content: 'Hello {{name}}, your service {{box}} has been activated successfully. Enjoy our premium features!',
    variables: ['name', 'box']
  },
  {
    id: 'credit_update',
    name: 'Credit Update',
    content: 'Hi {{name}}, your account has been updated. Remaining credits: {{credits}}. Thank you for using our service!',
    variables: ['name', 'credits']
  },
  {
    id: 'support',
    name: 'Support Message',
    content: 'Hello {{name}}, we\'re here to help! If you need assistance, please reply to this message or contact our support team.',
    variables: ['name']
  }
];

class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private phoneNumberId = import.meta.env.REACT_APP_WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
  private accessToken = import.meta.env.REACT_APP_WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    try {
      // Check if credentials are configured
      if (this.phoneNumberId === 'YOUR_PHONE_NUMBER_ID' || this.accessToken === 'YOUR_ACCESS_TOKEN') {
        console.error('❌ WhatsApp credentials not configured properly');
        console.error('Phone Number ID:', this.phoneNumberId);
        console.error('Access Token:', this.accessToken ? 'Set' : 'Not set');
        return {
          success: false,
          error: 'WhatsApp credentials not configured. Please update your .env file with actual values.',
          timestamp: new Date().toISOString()
        };
      }

      // Clean phone number (remove special characters, ensure it starts with country code)
      const cleanPhoneNumber = this.cleanPhoneNumber(to);
      
      console.log('📱 Sending WhatsApp message...');
      console.log('To:', cleanPhoneNumber);
      console.log('Phone Number ID:', this.phoneNumberId);
      console.log('Message:', message);
      
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.messages) {
        return {
          success: true,
          messageId: data.messages[0].id,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send message',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send a template message via WhatsApp Business API
   */
  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    parameters: string[] = []
  ): Promise<WhatsAppResponse> {
    try {
      const cleanPhoneNumber = this.cleanPhoneNumber(to);
      
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en_US'
            },
            components: parameters.length > 0 ? [{
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }] : []
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.messages) {
        return {
          success: true,
          messageId: data.messages[0].id,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send template message',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test WhatsApp API connection
   */
  async testConnection(): Promise<WhatsAppResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (response.ok) {
        return {
          success: true,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: 'WhatsApp API connection failed',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean and format phone number for WhatsApp API
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number doesn't start with country code, assume US (+1)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Generate message from template
   */
  generateMessageFromTemplate(templateId: string, variables: Record<string, string>): string {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let message = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return message;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}

export const whatsappService = new WhatsAppService();