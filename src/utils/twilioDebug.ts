import { twilioWhatsAppService } from '../services/twilioWhatsAppService';

// Diagnostic component to test Twilio WhatsApp connection
export const testTwilioConnection = async () => {
  console.log('🔍 TWILIO WHATSAPP CONNECTION DIAGNOSTIC');
  console.log('=====================================');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('REACT_APP_TWILIO_ACCOUNT_SID:', import.meta.env.REACT_APP_TWILIO_ACCOUNT_SID ? 'Set' : 'Not set');
  console.log('REACT_APP_TWILIO_AUTH_TOKEN:', import.meta.env.REACT_APP_TWILIO_AUTH_TOKEN ? 'Set' : 'Not set');
  console.log('REACT_APP_TWILIO_WHATSAPP_FROM:', import.meta.env.REACT_APP_TWILIO_WHATSAPP_FROM || 'Not set');
  
  // Test connection
  console.log('\n🔗 Testing Twilio Connection...');
  try {
    const connectionResult = await twilioWhatsAppService.testConnection();
    if (connectionResult.success) {
      console.log('✅ Connection successful!');
    } else {
      console.error('❌ Connection failed:', connectionResult.error);
    }
  } catch (error) {
    console.error('❌ Connection test error:', error);
  }
  
  // Test account info
  console.log('\n📊 Getting Account Info...');
  try {
    const accountInfo = await twilioWhatsAppService.getAccountInfo();
    if (accountInfo.success) {
      console.log('✅ Account info retrieved:', accountInfo.account);
    } else {
      console.error('❌ Failed to get account info:', accountInfo.error);
    }
  } catch (error) {
    console.error('❌ Account info error:', error);
  }
  
  // Test message sending (test mode)
  console.log('\n📱 Testing Message Send (Test Mode)...');
  try {
    const messageResult = await twilioWhatsAppService.sendTextMessage(
      '+1234567890',
      'Test message from diagnostic tool',
      true // Test mode
    );
    
    if (messageResult.success) {
      console.log('✅ Test message successful!', messageResult);
    } else {
      console.error('❌ Test message failed:', messageResult.error);
    }
  } catch (error) {
    console.error('❌ Test message error:', error);
  }
  
  console.log('\n🏁 Diagnostic complete!');
};

// Quick fix suggestions
export const getTwilioFixSuggestions = () => {
  const suggestions = [];
  
  if (!import.meta.env.REACT_APP_TWILIO_ACCOUNT_SID) {
    suggestions.push('❌ Missing REACT_APP_TWILIO_ACCOUNT_SID in .env file');
  }
  
  if (!import.meta.env.REACT_APP_TWILIO_AUTH_TOKEN) {
    suggestions.push('❌ Missing REACT_APP_TWILIO_AUTH_TOKEN in .env file');
  }
  
  if (!import.meta.env.REACT_APP_TWILIO_WHATSAPP_FROM) {
    suggestions.push('❌ Missing REACT_APP_TWILIO_WHATSAPP_FROM in .env file');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('✅ All environment variables are set');
    suggestions.push('💡 Try using Test Mode first to verify integration');
    suggestions.push('💡 Check if Twilio account is active and not suspended');
    suggestions.push('💡 Verify WhatsApp sandbox is set up correctly');
  }
  
  return suggestions;
};

// Call this in console to run diagnostics
if (typeof window !== 'undefined') {
  (window as any).testTwilioConnection = testTwilioConnection;
  (window as any).getTwilioFixSuggestions = getTwilioFixSuggestions;
}
