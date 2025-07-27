#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

// Test data for each API
const testData = {
  tmf620: {
    category: {
      name: 'Test MongoDB Category',
      description: 'Testing MongoDB integration for TMF620',
      lifecycleStatus: 'Active',
      '@type': 'Category'
    },
    productSpecification: {
      name: 'Test MongoDB Product Spec',
      description: 'Testing MongoDB integration',
      brand: 'ProdigyHub',
      lifecycleStatus: 'Active',
      '@type': 'ProductSpecification'
    },
    productOffering: {
      name: 'Test MongoDB Product Offering',
      description: 'Testing MongoDB integration',
      lifecycleStatus: 'Active',
      isSellable: true,
      '@type': 'ProductOffering'
    }
  },
  tmf637: {
    product: {
      name: 'Test MongoDB Product',
      description: 'Testing MongoDB integration for TMF637',
      status: 'active',
      isBundle: false,
      isCustomerVisible: true,
      '@type': 'Product'
    }
  },
  tmf679: {
    checkQualification: {
      description: 'Test MongoDB Check Qualification',
      instantSyncQualification: true,
      state: 'acknowledged',
      '@type': 'CheckProductOfferingQualification'
    },
    queryQualification: {
      description: 'Test MongoDB Query Qualification',
      instantSyncQualification: true,
      state: 'acknowledged',
      '@type': 'QueryProductOfferingQualification'
    }
  },
  tmf622: {
    productOrder: {
      category: 'B2C product order',
      description: 'Test MongoDB Product Order',
      priority: '4',
      productOrderItem: [{
        id: '001',
        quantity: 1,
        action: 'add',
        productOffering: {
          id: 'test-offering-001',
          name: 'Test Offering',
          '@type': 'ProductOfferingRef'
        },
        '@type': 'ProductOrderItem'
      }],
      '@type': 'ProductOrder'
    }
  },
  tmf688: {
    event: {
      eventType: 'TestEvent',
      title: 'Test MongoDB Event',
      description: 'Testing MongoDB integration for TMF688',
      priority: 'Normal',
      event: {
        testData: 'MongoDB integration test',
        timestamp: new Date().toISOString()
      },
      '@type': 'Event'
    },
    hub: {
      callback: 'http://example.com/callback',
      query: 'eventType=TestEvent',
      '@type': 'Hub'
    },
    topic: {
      name: 'Test MongoDB Topic',
      contentQuery: 'eventType=TestEvent',
      '@type': 'Topic'
    }
  },
  tmf760: {
    checkConfiguration: {
      instantSync: true,
      provideAlternatives: false,
      checkProductConfigurationItem: [{
        '@type': 'CheckProductConfigurationItem',
        id: '001',
        productConfiguration: {
          '@type': 'ProductConfiguration',
          productOffering: {
            id: 'test-offering-001',
            name: 'Test Product Offering',
            '@type': 'ProductOfferingRef'
          }
        }
      }],
      '@type': 'CheckProductConfiguration'
    },
    queryConfiguration: {
      instantSync: true,
      requestProductConfigurationItem: [{
        '@type': 'QueryProductConfigurationItem',
        id: '001',
        productConfiguration: {
          '@type': 'ProductConfiguration',
          productOffering: {
            id: 'test-offering-001',
            name: 'Test Product Offering',
            '@type': 'ProductOfferingRef'
          }
        }
      }],
      '@type': 'QueryProductConfiguration'
    }
  }
};

class MongoDBTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.createdResources = [];
  }

  async runAllTests() {
    console.log('🧪 Starting MongoDB Integration Test Suite for All TMF APIs'.cyan.bold);
    console.log('=' .repeat(80).gray);
    console.log(`🌐 Testing against: ${BASE_URL}`.blue);
    console.log('=' .repeat(80).gray);

    try {
      // Test health and database connection first
      await this.testHealthAndDatabase();
      
      // Test each API
      await this.testTMF620();
      await this.testTMF637();
      await this.testTMF679();
      await this.testTMF622();
      await this.testTMF688();
      await this.testTMF760();
      
      // Test MongoDB storage verification
      await this.testStorageVerification();
      
      this.printSummary();
      
    } catch (error) {
      this.logError('Test Suite Failed', error);
    } finally {
      // Cleanup created resources
      await this.cleanup();
    }
  }

  async testHealthAndDatabase() {
    console.log('\n📋 Testing Health Check and Database Connection...'.yellow.bold);
    
    try {
      // Test general health
      const healthResponse = await this.makeRequest('GET', '/health');
      this.assert(healthResponse.status === 'OK', 'Health check should return OK status');
      this.assert(healthResponse.database.connected === true, 'Database should be connected');
      this.logSuccess('Health Check', 'Server and database are healthy');
      
      // Test debug storage endpoint
      const storageResponse = await this.makeRequest('GET', '/debug/storage');
      this.assert(storageResponse.storage === 'MongoDB', 'Should use MongoDB storage');
      this.assert(storageResponse.connected === true, 'MongoDB should be connected');
      this.logSuccess('Storage Check', 'MongoDB storage verified');
      
    } catch (error) {
      this.logError('Health/Database Check', error);
    }
  }

  async testTMF620() {
    console.log('\n📦 Testing TMF620 - Product Catalog Management (MongoDB)...'.yellow.bold);
    
    try {
      // Test Category CRUD operations
      await this.testCRUDOperations(
        'TMF620 Category',
        '/productCatalogManagement/v5/category',
        testData.tmf620.category
      );
      
      // Test Product Specification
      await this.testCRUDOperations(
        'TMF620 Product Specification',
        '/productCatalogManagement/v5/productSpecification',
        testData.tmf620.productSpecification
      );
      
      // Test Product Offering
      await this.testCRUDOperations(
        'TMF620 Product Offering',
        '/productCatalogManagement/v5/productOffering',
        testData.tmf620.productOffering
      );
      
    } catch (error) {
      this.logError('TMF620 Test', error);
    }
  }

  async testTMF637() {
    console.log('\n🏭 Testing TMF637 - Product Inventory Management (MongoDB)...'.yellow.bold);
    
    try {
      await this.testCRUDOperations(
        'TMF637 Product',
        '/tmf-api/product',
        testData.tmf637.product
      );
      
    } catch (error) {
      this.logError('TMF637 Test', error);
    }
  }

  async testTMF679() {
    console.log('\n🔍 Testing TMF679 - Product Offering Qualification (MongoDB)...'.yellow.bold);
    
    try {
      // Test Check Product Offering Qualification
      await this.testCRUDOperations(
        'TMF679 Check Qualification',
        '/productOfferingQualification/v5/checkProductOfferingQualification',
        testData.tmf679.checkQualification
      );
      
      // Test Query Product Offering Qualification
      await this.testCRUDOperations(
        'TMF679 Query Qualification',
        '/productOfferingQualification/v5/queryProductOfferingQualification',
        testData.tmf679.queryQualification
      );
      
    } catch (error) {
      this.logError('TMF679 Test', error);
    }
  }

  async testTMF622() {
    console.log('\n📋 Testing TMF622 - Product Ordering Management (MongoDB)...'.yellow.bold);
    
    try {
      await this.testCRUDOperations(
        'TMF622 Product Order',
        '/productOrderingManagement/v4/productOrder',
        testData.tmf622.productOrder
      );
      
    } catch (error) {
      this.logError('TMF622 Test', error);
    }
  }

  async testTMF688() {
    console.log('\n🔔 Testing TMF688 - Event Management (MongoDB)...'.yellow.bold);
    
    try {
      // Test Event operations
      await this.testCRUDOperations(
        'TMF688 Event',
        '/tmf-api/event/v4/event',
        testData.tmf688.event
      );
      
      // Test Hub operations
      await this.testCRUDOperations(
        'TMF688 Hub',
        '/tmf-api/event/v4/hub',
        testData.tmf688.hub
      );
      
      // Test Topic operations
      await this.testCRUDOperations(
        'TMF688 Topic',
        '/tmf-api/event/v4/topic',
        testData.tmf688.topic
      );
      
    } catch (error) {
      this.logError('TMF688 Test', error);
    }
  }

  async testTMF760() {
    console.log('\n⚙️ Testing TMF760 - Product Configuration Management (MongoDB)...'.yellow.bold);
    
    try {
      // Test Check Product Configuration
      await this.testCRUDOperations(
        'TMF760 Check Configuration',
        '/tmf-api/productConfigurationManagement/v5/checkProductConfiguration',
        testData.tmf760.checkConfiguration
      );
      
      // Test Query Product Configuration
      await this.testCRUDOperations(
        'TMF760 Query Configuration',
        '/tmf-api/productConfigurationManagement/v5/queryProductConfiguration',
        testData.tmf760.queryConfiguration
      );
      
    } catch (error) {
      this.logError('TMF760 Test', error);
    }
  }

  async testCRUDOperations(name, endpoint, testDataObj) {
    let createdId = null;
    
    try {
      // CREATE (POST)
      console.log(`  • Testing ${name} - CREATE (POST)...`.cyan);
      const createResponse = await this.makeRequest('POST', endpoint, testDataObj);
      this.assert(createResponse.id, `${name} should have an ID after creation`);
      this.assert(createResponse['@type'], `${name} should have @type field`);
      createdId = createResponse.id;
      this.createdResources.push({ endpoint, id: createdId });
      this.logSuccess(`${name} CREATE`, `Created with ID: ${createdId}`);
      
      // READ (GET by ID)
      console.log(`  • Testing ${name} - READ (GET by ID)...`.cyan);
      const readResponse = await this.makeRequest('GET', `${endpoint}/${createdId}`);
      this.assert(readResponse.id === createdId, `${name} ID should match`);
      this.assert(readResponse['@type'], `${name} should have @type field in read response`);
      this.logSuccess(`${name} READ`, `Retrieved with ID: ${createdId}`);
      
      // LIST (GET all)
      console.log(`  • Testing ${name} - LIST (GET all)...`.cyan);
      const listResponse = await this.makeRequest('GET', endpoint);
      this.assert(Array.isArray(listResponse), `${name} list should return an array`);
      this.assert(listResponse.length > 0, `${name} list should contain created item`);
      this.logSuccess(`${name} LIST`, `Retrieved ${listResponse.length} items`);
      
      // UPDATE (PATCH) - if supported
      if (name.includes('TMF620') || name.includes('TMF637') || name.includes('TMF622')) {
        console.log(`  • Testing ${name} - UPDATE (PATCH)...`.cyan);
        const updateData = { description: `Updated MongoDB test - ${new Date().toISOString()}` };
        const updateResponse = await this.makeRequest('PATCH', `${endpoint}/${createdId}`, updateData);
        this.assert(updateResponse.id === createdId, `${name} ID should remain the same after update`);
        this.logSuccess(`${name} UPDATE`, `Updated with ID: ${createdId}`);
      }
      
      // DELETE
      console.log(`  • Testing ${name} - DELETE...`.cyan);
      await this.makeRequest('DELETE', `${endpoint}/${createdId}`);
      
      // Verify deletion
      try {
        await this.makeRequest('GET', `${endpoint}/${createdId}`);
        this.assert(false, `${name} should not exist after deletion`);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.logSuccess(`${name} DELETE`, `Successfully deleted ID: ${createdId}`);
          // Remove from cleanup list since it's already deleted
          this.createdResources = this.createdResources.filter(r => r.id !== createdId);
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      this.logError(`${name} CRUD Operations`, error);
      if (createdId) {
        this.createdResources.push({ endpoint, id: createdId });
      }
    }
  }

  async testStorageVerification() {
    console.log('\n💾 Testing MongoDB Storage Verification...'.yellow.bold);
    
    try {
      const storageResponse = await this.makeRequest('GET', '/debug/storage');
      
      // Verify storage type
      this.assert(storageResponse.storage === 'MongoDB', 'Storage should be MongoDB');
      this.assert(storageResponse.connected === true, 'MongoDB should be connected');
      
      // Verify collections exist
      const collections = storageResponse.collections;
      const expectedCollections = [
        'categories',
        'productspecifications', 
        'productofferings',
        'products',
        'checkproductofferingqualifications',
        'queryproductofferingqualifications',
        'productorders',
        'events',
        'hubs',
        'topics'
      ];
      
      expectedCollections.forEach(collection => {
        this.assert(
          collections.hasOwnProperty(collection),
          `MongoDB should have ${collection} collection`
        );
      });
      
      this.logSuccess('Storage Verification', 'All MongoDB collections verified');
      
    } catch (error) {
      this.logError('Storage Verification', error);
    }
  }

  async makeRequest(method, path, data = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${path}`,
        timeout: TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
      
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw {
          message: `${method} ${path} failed`,
          status: error.response.status,
          data: error.response.data,
          response: error.response
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          message: `No response received from ${method} ${path}`,
          request: error.request
        };
      } else {
        // Something else happened
        throw {
          message: `Request setup failed for ${method} ${path}`,
          error: error.message
        };
      }
    }
  }

  assert(condition, message) {
    if (condition) {
      this.results.passed++;
      this.results.tests.push({ status: 'PASS', message });
    } else {
      this.results.failed++;
      this.results.tests.push({ status: 'FAIL', message });
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  logSuccess(operation, details) {
    console.log(`    ✅ ${operation}: ${details}`.green);
  }

  logError(operation, error) {
    console.log(`    ❌ ${operation}: ${error.message || error}`.red);
    if (error.status) {
      console.log(`       Status: ${error.status}`.red);
    }
    if (error.data) {
      console.log(`       Response: ${JSON.stringify(error.data, null, 2)}`.red);
    }
    this.results.failed++;
  }

  async cleanup() {
    if (this.createdResources.length === 0) {
      return;
    }
    
    console.log('\n🧹 Cleaning up test resources...'.yellow.bold);
    
    for (const resource of this.createdResources) {
      try {
        await this.makeRequest('DELETE', `${resource.endpoint}/${resource.id}`);
        console.log(`    ✅ Cleaned up ${resource.id}`.green);
      } catch (error) {
        console.log(`    ⚠️ Could not clean up ${resource.id}: ${error.message}`.yellow);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(80).gray);
    console.log('📊 MongoDB Integration Test Results'.cyan.bold);
    console.log('='.repeat(80).gray);
    
    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.results.passed}`.green);
    console.log(`Failed: ${this.results.failed}`.red);
    console.log(`Pass Rate: ${passRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All MongoDB integration tests passed!'.green.bold);
      console.log('✅ All TMF APIs are successfully integrated with MongoDB'.green);
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above for details.'.yellow.bold);
    }
    
    console.log('\n🗄️ MongoDB Collections Tested:'.blue.bold);
    console.log('  • TMF620: categories, productspecifications, productofferings');
    console.log('  • TMF637: products');
    console.log('  • TMF679: checkproductofferingqualifications, queryproductofferingqualifications');
    console.log('  • TMF622: productorders, cancelproductorders');
    console.log('  • TMF688: events, hubs, topics');
    console.log('  • TMF760: checkproductconfigurations, queryproductconfigurations');
    
    console.log('='.repeat(80).gray);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new MongoDBTestSuite();
  tester.runAllTests()
    .then(() => {
      process.exit(tester.results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite crashed:'.red.bold, error);
      process.exit(1);
    });
}

module.exports = MongoDBTestSuite;