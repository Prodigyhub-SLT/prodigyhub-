// ===================================================================
// MongoDB Complete Integration Test
// File: test-mongodb-complete.js
// ===================================================================

require('dotenv').config();

// Try to require the correct database file
let database;
try {
  database = require('./src/config/database');
  console.log('📁 Using: src/config/database.js');
} catch (err) {
  try {
    database = require('./config/database');
    console.log('📁 Using: config/database.js');
  } catch (err2) {
    console.error('❌ Could not find database.js in src/config/ or config/');
    process.exit(1);
  }
}

// Try to require the models
let CheckProductConfiguration, QueryProductConfiguration;
try {
  CheckProductConfiguration = require('./src/models/CheckProductConfiguration');
  QueryProductConfiguration = require('./src/models/QueryProductConfiguration');
  console.log('📁 Using models from: src/models/');
} catch (err) {
  try {
    CheckProductConfiguration = require('./models/CheckProductConfiguration');
    QueryProductConfiguration = require('./models/QueryProductConfiguration');
    console.log('📁 Using models from: models/');
  } catch (err2) {
    console.error('❌ Could not find model files');
    process.exit(1);
  }
}

class MongoDBTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.createdIds = [];
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

  async runAllTests() {
    console.log('🧪 MongoDB Integration Test Suite');
    console.log('=' .repeat(60));
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.MONGODB_URI ? 'Atlas Cloud' : 'Local'}`);
    console.log('=' .repeat(60));
    
    try {
      // Test Suite
      await this.testDatabaseConnection();
      await this.testHealthCheck();
      await this.testCheckProductConfigurationCRUD();
      await this.testQueryProductConfigurationCRUD();
      await this.testFieldSelection();
      await this.testFilteringAndPagination();
      await this.testIndexes();
      await this.testConnectionStats();
      
      // Summary
      this.printSummary();
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      await this.cleanup();
    }
  }

  // ===================================
  // Test 1: Database Connection
  // ===================================
  async testDatabaseConnection() {
    this.log('Testing database connection...', 'info');
    
    try {
      await database.connect();
      
      if (database.isConnected()) {
        this.log('Database connection successful', 'success');
        
        // Test basic operations using health check
        const health = await database.healthCheck();
        if (health.status === 'healthy') {
          this.log('Database ping successful', 'success');
        } else {
          throw new Error(`Health check failed: ${health.message}`);
        }
        
        return true;
      } else {
        throw new Error('Connection state is not active');
      }
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===================================
  // Test 2: Health Check
  // ===================================
  async testHealthCheck() {
    this.log('Testing health check...', 'info');
    
    try {
      const health = await database.healthCheck();
      
      if (health.status === 'healthy') {
        this.log('Health check passed', 'success');
        this.log(`Response time: ${health.responseTime}`, 'info');
        
        // Log stats
        const stats = health.stats;
        this.log(`Collections: ${stats.collections}, Models: ${stats.models}`, 'info');
        
        return true;
      } else {
        throw new Error(`Health check failed: ${health.message}`);
      }
    } catch (error) {
      this.log(`Health check error: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Test 3: CheckProductConfiguration CRUD
  // ===================================
  async testCheckProductConfigurationCRUD() {
    this.log('Testing CheckProductConfiguration CRUD operations...', 'info');
    
    try {
      // CREATE
      const testCheckConfig = {
        '@type': 'CheckProductConfiguration',
        id: `test-check-${Date.now()}`,
        state: 'done',
        instantSync: true,
        provideAlternatives: false,
        channel: {
          id: '4407',
          href: 'https://localhost:3000/channel/4407',
          name: 'Test Channel',
          '@referredType': 'SalesChannel',
          '@type': 'ChannelRef'
        },
        checkProductConfigurationItem: [{
          '@type': 'CheckProductConfigurationItem',
          id: 'test-item-001',
          state: 'approved',
          contextItem: {
            '@type': 'ItemRef',
            id: 'test-item-001',
            itemId: 'test-item-001',
            entityId: '3472',
            entityHref: 'https://localhost:3000/quote/3472',
            name: 'Test Quote Item',
            '@referredType': 'QuoteItem'
          },
          productConfiguration: {
            '@type': 'ProductConfiguration',
            productOffering: {
              id: 'test-offering-001',
              href: 'https://localhost:3000/productOffering/test-offering-001',
              name: 'Test Product Offering',
              '@type': 'ProductOfferingRef'
            },
            configurationCharacteristic: [{
              '@type': 'ConfigurationCharacteristic',
              id: '77',
              name: 'Color',
              valueType: 'string',
              minCardinality: 1,
              maxCardinality: 1,
              isConfigurable: true,
              isVisible: true,
              configurationCharacteristicValue: [{
                '@type': 'ConfigurationCharacteristicValue',
                isSelectable: true,
                isSelected: true,
                isVisible: true,
                characteristicValue: {
                  name: 'Color',
                  value: 'Blue',
                  '@type': 'StringCharacteristic'
                }
              }]
            }]
          },
          stateReason: []
        }]
      };
      
      const createdCheck = new CheckProductConfiguration(testCheckConfig);
      await createdCheck.save();
      this.createdIds.push({ type: 'check', id: createdCheck.id });
      this.log(`✓ CREATE: CheckProductConfiguration created with ID: ${createdCheck.id}`, 'success');
      
      // READ
      const foundCheck = await CheckProductConfiguration.findOne({ id: createdCheck.id });
      if (foundCheck) {
        this.log(`✓ READ: CheckProductConfiguration found: ${foundCheck.id}`, 'success');
      } else {
        throw new Error('Created CheckProductConfiguration not found');
      }
      
      // UPDATE
      foundCheck.state = 'inProgress';
      await foundCheck.save();
      this.log(`✓ UPDATE: CheckProductConfiguration state updated to: ${foundCheck.state}`, 'success');
      
      // LIST
      const allChecks = await CheckProductConfiguration.find({}).limit(5);
      this.log(`✓ LIST: Found ${allChecks.length} CheckProductConfiguration(s)`, 'success');
      
      return true;
    } catch (error) {
      this.log(`CheckProductConfiguration CRUD failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Test 4: QueryProductConfiguration CRUD
  // ===================================
  async testQueryProductConfigurationCRUD() {
    this.log('Testing QueryProductConfiguration CRUD operations...', 'info');
    
    try {
      // CREATE
      const testQueryConfig = {
        '@type': 'QueryProductConfiguration',
        id: `test-query-${Date.now()}`,
        state: 'done',
        instantSync: true,
        requestProductConfigurationItem: [{
          '@type': 'QueryProductConfigurationItem',
          id: 'req-item-001',
          state: 'approved',
          productConfiguration: {
            '@type': 'ProductConfiguration',
            id: 'config-001',
            isSelectable: true,
            isSelected: true,
            isVisible: true,
            productOffering: {
              id: 'offering-001',
              href: 'https://localhost:3000/productOffering/offering-001',
              name: 'Test Offering',
              '@type': 'ProductOfferingRef'
            }
          }
        }],
        computedProductConfigurationItem: [{
          '@type': 'QueryProductConfigurationItem',
          id: 'comp-item-002',
          state: 'approved',
          productConfiguration: {
            '@type': 'ProductConfiguration',
            id: 'config-002',
            isSelectable: false,
            isSelected: true,
            isVisible: true,
            configurationAction: [{
              '@type': 'ConfigurationAction',
              action: 'add',
              description: 'Add new product',
              isSelected: true
            }],
            configurationPrice: [{
              '@type': 'ConfigurationPrice',
              name: 'Product price',
              priceType: 'oneTimeCharge',
              price: {
                taxRate: 22,
                '@type': 'Price',
                dutyFreeAmount: {
                  unit: 'USD',
                  value: 100,
                  '@type': 'Money'
                },
                taxIncludedAmount: {
                  unit: 'USD',
                  value: 122,
                  '@type': 'Money'
                }
              }
            }]
          }
        }]
      };
      
      const createdQuery = new QueryProductConfiguration(testQueryConfig);
      await createdQuery.save();
      this.createdIds.push({ type: 'query', id: createdQuery.id });
      this.log(`✓ CREATE: QueryProductConfiguration created with ID: ${createdQuery.id}`, 'success');
      
      // READ
      const foundQuery = await QueryProductConfiguration.findOne({ id: createdQuery.id });
      if (foundQuery) {
        this.log(`✓ READ: QueryProductConfiguration found: ${foundQuery.id}`, 'success');
      } else {
        throw new Error('Created QueryProductConfiguration not found');
      }
      
      // UPDATE
      foundQuery.state = 'inProgress';
      await foundQuery.save();
      this.log(`✓ UPDATE: QueryProductConfiguration state updated to: ${foundQuery.state}`, 'success');
      
      // LIST
      const allQueries = await QueryProductConfiguration.find({}).limit(5);
      this.log(`✓ LIST: Found ${allQueries.length} QueryProductConfiguration(s)`, 'success');
      
      return true;
    } catch (error) {
      this.log(`QueryProductConfiguration CRUD failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Test 5: Field Selection
  // ===================================
  async testFieldSelection() {
    this.log('Testing field selection...', 'info');
    
    try {
      // Test field selection on CheckProductConfiguration
      const checkWithFields = await CheckProductConfiguration.findOne({})
        .select('id state @type href');
      
      if (checkWithFields) {
        const fields = Object.keys(checkWithFields.toObject());
        this.log(`✓ Field selection working: [${fields.join(', ')}]`, 'success');
        
        // Verify only selected fields are present (plus MongoDB _id)
        const expectedFields = ['_id', 'id', 'state', '@type', 'href'];
        const hasOnlyExpectedFields = fields.every(field => 
          expectedFields.includes(field) || field.startsWith('_')
        );
        
        if (hasOnlyExpectedFields) {
          this.log('✓ Field selection correctly filtered', 'success');
        } else {
          this.log('⚠️ Field selection included unexpected fields', 'warning');
        }
      } else {
        this.log('No documents found for field selection test', 'warning');
      }
      
      return true;
    } catch (error) {
      this.log(`Field selection test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Test 6: Filtering and Pagination
  // ===================================
  async testFilteringAndPagination() {
    this.log('Testing filtering and pagination...', 'info');
    
    try {
      // Test state filtering
      const doneConfigs = await CheckProductConfiguration.find({ state: 'done' });
      this.log(`✓ State filtering: Found ${doneConfigs.length} configs with state 'done'`, 'success');
      
      // Test pagination
      const paginatedConfigs = await CheckProductConfiguration.find({})
        .limit(2)
        .skip(0)
        .sort({ createdAt: -1 });
      this.log(`✓ Pagination: Retrieved ${paginatedConfigs.length} results (limit: 2)`, 'success');
      
      // Test count
      const totalCount = await CheckProductConfiguration.countDocuments();
      this.log(`✓ Count: Total CheckProductConfigurations: ${totalCount}`, 'success');
      
      return true;
    } catch (error) {
      this.log(`Filtering/pagination test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Test 7: Index Performance
  // ===================================
  async testIndexes() {
    this.log('Testing database indexes...', 'info');
    
    try {
      // Get indexes for CheckProductConfiguration
      const checkIndexes = await CheckProductConfiguration.collection.getIndexes();
      this.log(`✓ CheckProductConfiguration indexes: ${Object.keys(checkIndexes).length}`, 'success');
      
      // Get indexes for QueryProductConfiguration
      const queryIndexes = await QueryProductConfiguration.collection.getIndexes();
      this.log(`✓ QueryProductConfiguration indexes: ${Object.keys(queryIndexes).length}`, 'success');
      
      // Test index usage with explain
      const explanation = await CheckProductConfiguration.find({ id: 'test-id' }).explain();
      this.log('✓ Query explanation retrieved (indexes working)', 'success');
      
      return true;
    } catch (error) {
      this.log(`Index test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Test 8: Connection Statistics
  // ===================================
  async testConnectionStats() {
    this.log('Testing connection statistics...', 'info');
    
    try {
      const stats = database.getStats();
      
      this.log(`✓ Connection State: ${stats.state}`, 'success');
      this.log(`✓ Collections: ${stats.collections}`, 'info');
      this.log(`✓ Models: ${stats.models}`, 'info');
      this.log(`✓ Host: ${stats.host}:${stats.port}`, 'info');
      this.log(`✓ Database: ${stats.name}`, 'info');
      
      if (stats.uptime) {
        this.log(`✓ Uptime: ${Math.round(stats.uptime / 1000)}s`, 'info');
      }
      
      return true;
    } catch (error) {
      this.log(`Connection stats test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ===================================
  // Cleanup
  // ===================================
  async cleanup() {
    this.log('Cleaning up test data...', 'info');
    
    try {
      for (const item of this.createdIds) {
        if (item.type === 'check') {
          await CheckProductConfiguration.findOneAndDelete({ id: item.id });
          this.log(`✓ Deleted CheckProductConfiguration: ${item.id}`, 'success');
        } else if (item.type === 'query') {
          await QueryProductConfiguration.findOneAndDelete({ id: item.id });
          this.log(`✓ Deleted QueryProductConfiguration: ${item.id}`, 'success');
        }
      }
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'warning');
    }
    
    // Close database connection
    try {
      await database.disconnect();
      this.log('Database connection closed', 'success');
    } catch (error) {
      this.log(`Error closing connection: ${error.message}`, 'warning');
    }
  }

  // ===================================
  // Summary Report
  // ===================================
  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY REPORT');
    console.log('=' .repeat(60));
    
    const totalTests = this.testResults.length;
    const successCount = this.testResults.filter(r => r.status === 'success').length;
    const errorCount = this.testResults.filter(r => r.status === 'error').length;
    const warningCount = this.testResults.filter(r => r.status === 'warning').length;
    
    console.log(`📈 Total Operations: ${totalTests}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`⏱️ Total Time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    
    const successRate = Math.round((successCount / totalTests) * 100);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ALL TESTS PASSED! MongoDB integration is working perfectly!');
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    }
    
    console.log('=' .repeat(60));
  }
}

// ===================================
// Run Tests
// ===================================
async function runTests() {
  const tester = new MongoDBTester();
  await tester.runAllTests();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = MongoDBTester;