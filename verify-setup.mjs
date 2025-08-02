// Quick verification script to check MongoDB integration
import { connectToDatabase } from './src/services/database.js';

async function verifySetup() {
  console.log('🔍 Verifying MongoDB Integration...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const db = await connectToDatabase();
    console.log('✅ Database connection successful');
    
    // Check collections
    console.log('2. Checking collections...');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`, collections.map(c => c.name));
    
    // Check admin users
    console.log('3. Checking admin users...');
    const adminCount = await db.collection('admins').countDocuments();
    console.log(`✅ Found ${adminCount} admin users`);
    
    // Check customers
    console.log('4. Checking customers...');
    const customerCount = await db.collection('customers').countDocuments();
    console.log(`✅ Found ${customerCount} customers`);
    
    console.log('\n🎉 MongoDB integration verified successfully!');
    console.log('\nYou can now:');
    console.log('- Run `npm run dev` to start the development server');
    console.log('- Login with: admin@example.com / admin123');
    console.log('- Browse customers, add new ones, and manage data');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Check your .env file configuration');
    console.log('3. Run `node test-db.mjs` first to seed the database');
  }
}

verifySetup();
