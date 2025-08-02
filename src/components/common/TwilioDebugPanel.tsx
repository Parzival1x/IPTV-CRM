import { useState } from 'react';
import { twilioWhatsAppService } from '../../services/twilioWhatsAppService';

const TwilioDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugResults, setDebugResults] = useState<string>('');
  
  const runDiagnostics = async () => {
    setDebugResults('Running diagnostics...\n');
    
    // Check environment variables
    const envCheck = [
      `Account SID: ${import.meta.env.REACT_APP_TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Not set'}`,
      `Auth Token: ${import.meta.env.REACT_APP_TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Not set'}`,
      `From Number: ${import.meta.env.REACT_APP_TWILIO_WHATSAPP_FROM || '❌ Not set'}`,
    ].join('\n');
    
    setDebugResults(prev => prev + '\n📋 Environment Variables:\n' + envCheck + '\n');
    
    // Test connection
    try {
      setDebugResults(prev => prev + '\n🔗 Testing connection...\n');
      const connectionResult = await twilioWhatsAppService.testConnection();
      setDebugResults(prev => prev + (connectionResult.success ? '✅ Connection successful!' : `❌ Connection failed: ${connectionResult.error}`) + '\n');
    } catch (error) {
      setDebugResults(prev => prev + `❌ Connection error: ${error}\n`);
    }
    
    // Test message (test mode)
    try {
      setDebugResults(prev => prev + '\n📱 Testing message send (test mode)...\n');
      const messageResult = await twilioWhatsAppService.sendTextMessage(
        '+1234567890',
        'Test diagnostic message',
        true
      );
      setDebugResults(prev => prev + (messageResult.success ? '✅ Test message successful!' : `❌ Test message failed: ${messageResult.error}`) + '\n');
    } catch (error) {
      setDebugResults(prev => prev + `❌ Test message error: ${error}\n`);
    }
    
    setDebugResults(prev => prev + '\n🏁 Diagnostics complete!\n');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        🔧 Debug Twilio
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md w-full z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">Twilio Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={runDiagnostics}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Run Diagnostics
        </button>
        
        {debugResults && (
          <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">{debugResults}</pre>
          </div>
        )}
        
        <div className="text-xs text-gray-600">
          <p><strong>Quick fixes:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Join Twilio sandbox: Text "join [keyword]" to +1(415)523-8886</li>
            <li>Use test mode first</li>
            <li>Check browser console for detailed logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TwilioDebugPanel;
