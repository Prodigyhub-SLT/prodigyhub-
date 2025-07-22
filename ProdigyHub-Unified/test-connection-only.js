// Simple MongoDB Connection Test
// File: test-connection-only.js

require('dotenv').config();

async function testConnection() {
  console.log('🧪 Simple MongoDB Connection Test');
  console.log('=' .repeat(50));
  
  try {
    // Try to require database from different paths
    let database;
    try {
      database = require('./src/config/database');
      console.log('✅ Found database.js in src/config/');
    } catch (err) {
      database = require('./config/database');
      console.log('✅ Found database.js in config/');
    }
    
    console.log('📊 Attempting connection...');
    await database.connect();
    
    if (database.isConnected()) {
      console.log('✅ CONNECTION SUCCESS!');
      console.log('📊 Connection State:', database.getConnectionState());
      
      // Test ping
      const startTime = Date.now();
      const health = await database.healthCheck();
      const responseTime = Date.now() - startTime;
      
      console.log('✅ Health Check:', health.status);
      console.log('⏱️ Response Time:', responseTime + 'ms');
      
      // Get stats
      const stats = database.getStats();
      console.log('📈 Stats:', {
        host: stats.host,
        port: stats.port,
        database: stats.name,
        collections: stats.collections
      });
      
    } else {
      console.log('❌ Connection failed - not in connected state');
    }
    
  } catch (error) {
    console.log('❌ CONNECTION FAILED:');
    console.log('Error:', error.message);
    console.log('Error Type:', error.constructor.name);
    
    if (error.message.includes('buffermaxentries')) {
      console.log('\n💡 SOLUTION: You have an old database.js file with deprecated options');
      console.log('   - Remove or rename config/database.js');
      console.log('   - Use only src/config/database.js');
    }
    
  } finally {
    try {
      const database = require('./src/config/database');
      await database.disconnect();
      console.log('✅ Disconnected cleanly');
    } catch (err) {
      console.log('⚠️ Error during disconnect:', err.message);
    }
  }
}

testConnection().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});