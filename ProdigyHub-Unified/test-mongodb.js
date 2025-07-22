// ===================================================================
// Path: test-mongodb.js
// MongoDB Integration Test Script
// ===================================================================

require('dotenv').config();
const database = require('./config/database');
const CheckProductConfiguration = require('./models/CheckProductConfiguration');
const QueryProductConfiguration = require('./models/QueryProductConfiguration');

async function testMongoDB() {
  try {
    console.log('🧪 Testing MongoDB Integration...\n');
    
    // Test 1: Connect to database
    console.log('1. Connecting to MongoDB...');
    await database.connect();
    console.log('✅ Database connected successfully');
    
    // Test 2: Create CheckProductConfiguration
    console.log('\n2. Creating CheckProductConfiguration...');
    const testCheckConfig = new CheckProductConfiguration({
      '@type': 'CheckProductConfiguration',
      state: 'done',
      instantSync: true,
      checkProductConfigurationItem: [{
        '@type': 'CheckProductConfigurationItem',
        id: 'test-check-item-001',
        state: 'approved',
        productConfiguration: {
          '@type': 'ProductConfiguration',
          productOffering: {
            id: 'test-offering-check',
            name: 'Test Check Product Offering',
            '@type': 'ProductOfferingRef'
          },
          configurationCharacteristic: [{
            '@type': 'ConfigurationCharacteristic',
            id: 'test-char-1',
            name: 'TestCharacteristic',
            valueType: 'string',
            minCardinality: 1,
            maxCardinality: 1,
            isConfigurable: true,
            configurationCharacteristicValue: [{
              '@type': 'ConfigurationCharacteristicValue',
              isSelectable: true,
              isSelected: true,
              characteristicValue: {
                name: 'TestCharacteristic',
                value: 'TestValue',
                '@type': 'StringCharacteristic'
              }
            }]
          }]
        }
      }]
    });
    
    await testCheckConfig.save();
    console.log('✅ CheckProductConfiguration created with ID:', testCheckConfig.id);
    
    // Test 3: Create QueryProductConfiguration
    console.log('\n3. Creating QueryProductConfiguration...');
    const testQueryConfig = new QueryProductConfiguration({
      '@type': 'QueryProductConfiguration',
      state: 'done',
      instantSync: true,
      requestProductConfigurationItem: [{
        '@type': 'QueryProductConfigurationItem',
        id: 'test-query-item-001',
        state: 'approved',
        productConfiguration: {
          '@type': 'ProductConfiguration',
          productOffering: {
            id: 'test-offering-query',
            name: 'Test Query Product Offering',
            '@type': 'ProductOfferingRef'
          }
        }
      }],
      computedProductConfigurationItem: []
    });
    
    await testQueryConfig.save();
    console.log('✅ QueryProductConfiguration created with ID:', testQueryConfig.id);
    
    // Test 4: Find configurations
    console.log('\n4. Finding configurations...');
    const foundCheck = await CheckProductConfiguration.findOne({ id: testCheckConfig.id });
    const foundQuery = await QueryProductConfiguration.findOne({ id: testQueryConfig.id });
    console.log('✅ CheckProductConfiguration found:', foundCheck.id);
    console.log('✅ QueryProductConfiguration found:', foundQuery.id);
    
    // Test 5: Test field selection
    console.log('\n5. Testing field selection...');
    const selectedFields = await CheckProductConfiguration.findOne({ id: testCheckConfig.id })
      .select('id state @type href');
    console.log('✅ Field selection working:', Object.keys(selectedFields.toObject()));
    
    // Test 6: Test filtering
    console.log('\n6. Testing filtering...');
    const doneConfigs = await CheckProductConfiguration.find({ state: 'done' });
    console.log('✅ Found', doneConfigs.length, 'configurations with state "done"');
    
    // Test 7: Test pagination
    console.log('\n7. Testing pagination...');
    const paginatedConfigs = await CheckProductConfiguration.find({})
      .limit(1)
      .skip(0)
      .sort({ createdAt: -1 });
    console.log('✅ Pagination working:', paginatedConfigs.length, 'result(s)');
    
    // Test 8: Count documents
    console.log('\n8. Counting documents...');
    const checkCount = await CheckProductConfiguration.countDocuments();
    const queryCount = await QueryProductConfiguration.countDocuments();
    console.log('✅ CheckProductConfiguration count:', checkCount);
    console.log('✅ QueryProductConfiguration count:', queryCount);
    
    // Test 9: Update configuration
    console.log('\n9. Testing update...');
    foundCheck.state = 'inProgress';
    await foundCheck.save();
    console.log('✅ Configuration updated successfully');
    
    // Test 10: Clean up
    console.log('\n10. Cleaning up test data...');
    await CheckProductConfiguration.findOneAndDelete({ id: testCheckConfig.id });
    await QueryProductConfiguration.findOneAndDelete({ id: testQueryConfig.id });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 MongoDB integration test completed successfully!');
    console.log('\n📊 Database Stats:');
    console.log(database.getStats());
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await database.disconnect();
    process.exit(0);
  }
}

// Run the test
testMongoDB();