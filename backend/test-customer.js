const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Customer = require('./models/Customer');

async function testCustomerCreation() {
  try {
    console.log('🧪 Testing Customer Creation...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test customer data
    const testCustomer = {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+1234567890',
      address: '123 Test Street',
      status: 'pending',
      avatar: '👤',
      role: 'Customer',
      mac: 'AA:BB:CC:DD:EE:FF',
      box: 'TestBox001',
      startDate: '2025-07-17',
      paymentDate: '2025-07-17',
      paymentMode: 'Credit Card',
      amount: '100.00',
      expiryDate: '2025-08-17',
      totalCredit: '100.00',
      alreadyGiven: '0.00',
      remainingCredits: '100.00',
      note: 'Test customer for debugging',
      serviceDuration: '30 days'
    };

    console.log('📦 Test customer data:', JSON.stringify(testCustomer, null, 2));

    // Try to create customer
    console.log('💾 Creating test customer...');
    const customer = new Customer(testCustomer);
    
    // Validate before saving
    const validationError = customer.validateSync();
    if (validationError) {
      console.error('❌ Validation errors:', validationError.errors);
      return;
    }
    
    await customer.save();
    console.log('✅ Test customer created successfully!');
    console.log('Customer ID:', customer._id);

    // Clean up - delete test customer
    await Customer.deleteOne({ email: 'test@example.com' });
    console.log('🧹 Test customer cleaned up');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyValue);
    }
    
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testCustomerCreation();
