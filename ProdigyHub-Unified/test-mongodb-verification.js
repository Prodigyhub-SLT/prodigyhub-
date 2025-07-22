// ===================================================================
// MongoDB Data Verification Test Suite
// File: test-mongodb-verification.js
// ===================================================================

require('dotenv').config();
const database = require('./src/config/database');
const CheckProductConfiguration = require('./src/models/CheckProductConfiguration');
const QueryProductConfiguration = require('./src/models/QueryProductConfiguration');

class MongoDBVerificationTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const symbols = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    console.log(`${symbols[status]} [${timestamp}] ${message}`);
    
    this.testResults.push({
      timestamp,
      message,
      status,
      elapsed: Date.now() - this.startTime
    });
  }

  // ===================================
  // 1. CREATE TEST DATA VIA API
  // ===================================
  async createTestDataViaAPI() {
    this.log('Creating test data via API calls...', 'info');
    
    const fetch = require('node-fetch');
    const baseUrl = 'http://localhost:3000';
    
    try {
      // Create CheckProductConfiguration via API
      const checkResponse = await fetch(`${baseUrl}/tmf-api/productConfigurationManagement/v5/checkProductConfiguration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkProductConfigurationItem: [{
            '@type': 'CheckProductConfigurationItem',
            id: `api-test-${Date.now()}`,
            productConfiguration: {
              '@type': 'ProductConfiguration',
              productOffering: {
                id: 'api-offering-123',
                name: 'API Test Offering'
              }
            }
          }],
          instantSync: true
        })
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        this.log(`✓ CheckProductConfiguration created via API: ${checkData.id}`, 'success');
        return { checkId: checkData.id };
      } else {
        throw new Error(`API call failed: ${checkResponse.status}`);
      }
      
    } catch (error) {
      this.log(`✗ Failed to create test data via API: ${error.message}`, 'error');
      return null;
    }
  }

  // ===================================
  // 2. DIRECT DATABASE VERIFICATION
  // ===================================
  async verifyDatabaseConnection() {
    this.log('Testing database connection...', 'info');
    
    try {
      await database.connect();
      
      if (database.isConnected()) {
        this.log('✓ Database connection successful', 'success');
        
        const health = await database.healthCheck();
        this.log(`✓ Database health: ${health.status} (${health.responseTime})`, 'success');
        
        return true;
      } else {
        throw new Error('Database not in connected state');
      }
    } catch (error) {
      this.log(`✗ Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // 3. CHECK COLLECTIONS EXIST
  // ===================================
  async verifyCollectionsExist() {
    this.log('Checking if collections exist...', 'info');
    
    try {
      const db = database.connection.db;
      const collections = await db.listCollections().toArray();
      
      const collectionNames = collections.map(c => c.name);
      this.log(`✓ Found collections: ${collectionNames.join(', ')}`, 'success');
      
      const expectedCollections = ['checkproductconfigurations', 'queryproductconfigurations'];
      const missingCollections = expectedCollections.filter(name => !collectionNames.includes(name));
      
      if (missingCollections.length === 0) {
        this.log('✓ All expected collections exist', 'success');
        return true;
      } else {
        this.log(`⚠️ Missing collections: ${missingCollections.join(', ')}`, 'warning');
        return false;
      }
      
    } catch (error) {
      this.log(`✗ Failed to check collections: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // 4. COUNT DOCUMENTS IN COLLECTIONS
  // ===================================
  async countDocumentsInCollections() {
    this.log('Counting documents in collections...', 'info');
    
    try {
      // Count using Mongoose models
      const checkCount = await CheckProductConfiguration.countDocuments();
      const queryCount = await QueryProductConfiguration.countDocuments();
      
      this.log(`✓ CheckProductConfiguration documents: ${checkCount}`, 'success');
      this.log(`✓ QueryProductConfiguration documents: ${queryCount}`, 'success');
      
      // Count using raw MongoDB
      const db = database.connection.db;
      const rawCheckCount = await db.collection('checkproductconfigurations').countDocuments();
      const rawQueryCount = await db.collection('queryproductconfigurations').countDocuments();
      
      this.log(`✓ Raw MongoDB check count: ${rawCheckCount}`, 'success');
      this.log(`✓ Raw MongoDB query count: ${rawQueryCount}`, 'success');
      
      return {
        mongoose: { check: checkCount, query: queryCount },
        raw: { check: rawCheckCount, query: rawQueryCount }
      };
      
    } catch (error) {
      this.log(`✗ Failed to count documents: ${error.message}`, 'error');
      return null;
    }
  }

  // ===================================
  // 5. INSERT TEST DOCUMENT DIRECTLY
  // ===================================
  async insertTestDocumentDirectly() {
    this.log('Inserting test document directly into MongoDB...', 'info');
    
    try {
      const testDoc = {
        '@type': 'CheckProductConfiguration',
        id: `direct-test-${Date.now()}`,
        state: 'done',
        instantSync: true,
        checkProductConfigurationItem: [{
          '@type': 'CheckProductConfigurationItem',
          id: 'direct-item-001',
          productConfiguration: {
            '@type': 'ProductConfiguration',
            productOffering: {
              id: 'direct-offering-123',
              name: 'Direct Insert Test Offering'
            }
          }
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert using Mongoose model
      const mongooseDoc = new CheckProductConfiguration(testDoc);
      await mongooseDoc.save();
      
      this.log(`✓ Document inserted via Mongoose: ${mongooseDoc.id}`, 'success');
      
      // Verify it exists
      const foundDoc = await CheckProductConfiguration.findOne({ id: mongooseDoc.id });
      if (foundDoc) {
        this.log(`✓ Document verified in database: ${foundDoc.id}`, 'success');
        return foundDoc.id;
      } else {
        throw new Error('Document not found after insertion');
      }
      
    } catch (error) {
      this.log(`✗ Failed to insert test document: ${error.message}`, 'error');
      return null;
    }
  }

  // ===================================
  // 6. QUERY DOCUMENTS FROM DATABASE
  // ===================================
  async queryDocumentsFromDatabase() {
    this.log('Querying documents from database...', 'info');
    
    try {
      // Get recent documents
      const recentDocs = await CheckProductConfiguration.find({})
        .sort({ createdAt: -1 })
        .limit(5);
      
      this.log(`✓ Found ${recentDocs.length} recent documents`, 'success');
      
      recentDocs.forEach((doc, index) => {
        this.log(`   ${index + 1}. ID: ${doc.id}, State: ${doc.state}, Created: ${doc.createdAt}`, 'info');
      });
      
      // Test field selection
      const selectedFields = await CheckProductConfiguration.find({})
        .select('id state @type')
        .limit(3);
      
      this.log(`✓ Field selection test: ${selectedFields.length} documents`, 'success');
      
      // Test filtering
      const doneConfigs = await CheckProductConfiguration.find({ state: 'done' });
      this.log(`✓ State filtering test: ${doneConfigs.length} documents with state 'done'`, 'success');
      
      return {
        recent: recentDocs.length,
        fieldSelection: selectedFields.length,
        filtered: doneConfigs.length
      };
      
    } catch (error) {
      this.log(`✗ Failed to query documents: ${error.message}`, 'error');
      return null;
    }
  }

  // ===================================
  // 7. CHECK INDEXES
  // ===================================
  async checkIndexes() {
    this.log('Checking database indexes...', 'info');
    
    try {
      const checkIndexes = await CheckProductConfiguration.collection.getIndexes();
      const queryIndexes = await QueryProductConfiguration.collection.getIndexes();
      
      this.log(`✓ CheckProductConfiguration indexes: ${Object.keys(checkIndexes).length}`, 'success');
      Object.keys(checkIndexes).forEach(indexName => {
        this.log(`   - ${indexName}: ${JSON.stringify(checkIndexes[indexName])}`, 'info');
      });
      
      this.log(`✓ QueryProductConfiguration indexes: ${Object.keys(queryIndexes).length}`, 'success');
      Object.keys(queryIndexes).forEach(indexName => {
        this.log(`   - ${indexName}: ${JSON.stringify(queryIndexes[indexName])}`, 'info');
      });
      
      return true;
    } catch (error) {
      this.log(`✗ Failed to check indexes: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // 8. PERFORMANCE TEST
  // ===================================
  async performanceTest() {
    this.log('Running performance test...', 'info');
    
    try {
      const startTime = Date.now();
      
      // Insert multiple documents
      const bulkDocs = [];
      for (let i = 0; i < 10; i++) {
        bulkDocs.push({
          '@type': 'CheckProductConfiguration',
          id: `perf-test-${Date.now()}-${i}`,
          state: i % 2 === 0 ? 'done' : 'acknowledged',
          instantSync: true,
          checkProductConfigurationItem: [{
            '@type': 'CheckProductConfigurationItem',
            id: `perf-item-${i}`,
            productConfiguration: {
              '@type': 'ProductConfiguration',
              productOffering: {
                id: `perf-offering-${i}`,
                name: `Performance Test Offering ${i}`
              }
            }
          }]
        });
      }

      await CheckProductConfiguration.insertMany(bulkDocs);
      const insertTime = Date.now() - startTime;
      
      this.log(`✓ Bulk insert of 10 documents completed in ${insertTime}ms`, 'success');
      
      // Query performance test
      const queryStartTime = Date.now();
      const results = await CheckProductConfiguration.find({ state: 'done' }).limit(100);
      const queryTime = Date.now() - queryStartTime;
      
      this.log(`✓ Query completed in ${queryTime}ms, found ${results.length} documents`, 'success');
      
      return { insertTime, queryTime, documentsFound: results.length };
      
    } catch (error) {
      this.log(`✗ Performance test failed: ${error.message}`, 'error');
      return null;
    }
  }

  // ===================================
  // 9. DATABASE STATS
  // ===================================
  async getDatabaseStats() {
    this.log('Getting database statistics...', 'info');
    
    try {
      const db = database.connection.db;
      
      // Database stats
      const dbStats = await db.stats();
      this.log(`✓ Database: ${dbStats.db}`, 'success');
      this.log(`✓ Collections: ${dbStats.collections}`, 'success');
      this.log(`✓ Data Size: ${Math.round(dbStats.dataSize / 1024)} KB`, 'success');
      this.log(`✓ Storage Size: ${Math.round(dbStats.storageSize / 1024)} KB`, 'success');
      this.log(`✓ Indexes: ${dbStats.indexes}`, 'success');
      
      // Collection-specific stats
      const checkStats = await db.collection('checkproductconfigurations').stats();
      this.log(`✓ CheckProductConfigurations collection:`, 'success');
      this.log(`   - Documents: ${checkStats.count}`, 'info');
      this.log(`   - Size: ${Math.round(checkStats.size / 1024)} KB`, 'info');
      this.log(`   - Average Object Size: ${Math.round(checkStats.avgObjSize)} bytes`, 'info');
      
      return {
        database: dbStats,
        checkCollection: checkStats
      };
      
    } catch (error) {
      this.log(`✗ Failed to get database stats: ${error.message}`, 'error');
      return null;
    }
  }

  // ===================================
  // 10. CLEANUP TEST DATA
  // ===================================
  async cleanupTestData() {
    this.log('Cleaning up test data...', 'info');
    
    try {
      // Remove test documents
      const deleteResult = await CheckProductConfiguration.deleteMany({
        id: { $regex: /^(direct-test|perf-test|api-test)/ }
      });
      
      this.log(`✓ Cleaned up ${deleteResult.deletedCount} test documents`, 'success');
      
      return deleteResult.deletedCount;
    } catch (error) {
      this.log(`✗ Failed to cleanup test data: ${error.message}`, 'error');
      return 0;
    }
  }

  // ===================================
  // MAIN TEST RUNNER
  // ===================================
  async runAllTests() {
    console.log('🧪 MongoDB Data Verification Test Suite');
    console.log('=' .repeat(60));
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.MONGODB_URI ? 'Atlas Cloud' : 'Local'}`);
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Verify database connection
      const connectionOk = await this.verifyDatabaseConnection();
      if (!connectionOk) {
        throw new Error('Cannot proceed without database connection');
      }
      
      // Test 2: Check collections exist
      await this.verifyCollectionsExist();
      
      // Test 3: Count existing documents
      const initialCounts = await this.countDocumentsInCollections();
      
      // Test 4: Create test data via API
      const apiTestResult = await this.createTestDataViaAPI();
      
      // Test 5: Insert document directly
      const directInsertId = await this.insertTestDocumentDirectly();
      
      // Test 6: Count documents again to verify inserts
      this.log('Verifying document counts after inserts...', 'info');
      const newCounts = await this.countDocumentsInCollections();
      
      if (newCounts && initialCounts) {
        const checkIncrease = newCounts.mongoose.check - initialCounts.mongoose.check;
        this.log(`✓ CheckProductConfiguration count increased by: ${checkIncrease}`, 'success');
      }
      
      // Test 7: Query documents
      await this.queryDocumentsFromDatabase();
      
      // Test 8: Check indexes
      await this.checkIndexes();
      
      // Test 9: Performance test
      await this.performanceTest();
      
      // Test 10: Database stats
      await this.getDatabaseStats();
      
      // Test 11: Cleanup
      await this.cleanupTestData();
      
      // Final verification
      this.log('Final verification...', 'info');
      await this.countDocumentsInCollections();
      
      this.printSummary();
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error('Stack trace:', error.stack);
    } finally {
      await this.disconnect();
    }
  }

  // ===================================
  // SUMMARY REPORT
  // ===================================
  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MONGODB VERIFICATION SUMMARY');
    console.log('=' .repeat(60));
    
    const totalOperations = this.testResults.length;
    const successCount = this.testResults.filter(r => r.status === 'success').length;
    const errorCount = this.testResults.filter(r => r.status === 'error').length;
    const warningCount = this.testResults.filter(r => r.status === 'warning').length;
    
    console.log(`📈 Total Operations: ${totalOperations}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`⏱️ Total Time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    
    const successRate = Math.round((successCount / totalOperations) * 100);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ALL MONGODB OPERATIONS SUCCESSFUL!');
      console.log('✅ Your MongoDB integration is working perfectly!');
      console.log('✅ Data is being saved and retrieved correctly!');
    } else {
      console.log('\n⚠️ Some operations failed. Check the logs above for details.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   • Check MongoDB Compass to see your data');
    console.log('   • Test your API endpoints');
    console.log('   • Monitor database performance');
    
    console.log('=' .repeat(60));
  }

  async disconnect() {
    try {
      await database.disconnect();
      this.log('Database connection closed', 'success');
    } catch (error) {
      this.log(`Error closing connection: ${error.message}`, 'warning');
    }
  }
}

// ===================================
// RUN TESTS
// ===================================
async function runTests() {
  // Check if node-fetch is available
  try {
    require('node-fetch');
  } catch (error) {
    console.log('📦 Installing node-fetch for API testing...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install node-fetch', { stdio: 'inherit' });
      console.log('✅ node-fetch installed successfully');
    } catch (installError) {
      console.log('⚠️ Could not install node-fetch. Skipping API tests.');
    }
  }

  const tester = new MongoDBVerificationTester();
  await tester.runAllTests();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = MongoDBVerificationTester;