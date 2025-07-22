#!/usr/bin/env node

const axios = require('axios');
const { 
  sampleProductOrder1, 
  sampleProductOrder2, 
  sampleCancelProductOrder,
  sampleConfigurableProductOrder 
} = require('./sampleData');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_PATH = '/productOrderingManagement/v4';
const FULL_BASE_URL = `${BASE_URL}${API_PATH}`;

class TMF622APITester {
  constructor() {
    this.createdOrderIds = [];
    this.createdCancelOrderIds = [];
  }

  async runTests() {
    console.log('🧪 Starting TMF622 Product Ordering API Tests');
    console.log('=' .repeat(60));
    console.log(`🌐 Testing against: ${FULL_BASE_URL}`);
    console.log('=' .repeat(60));

    try {
      // Test server health
      await this.testHealthCheck();
      
      // Test product order operations
      await this.testCreateProductOrder();
      await this.testGetProductOrders();
      await this.testGetProductOrderById();
      await this.testUpdateProductOrder();
      
      // Test cancel product order operations
      await this.testCreateCancelProductOrder();
      await this.testGetCancelProductOrders();
      await this.testGetCancelProductOrderById();
      
      // Test error scenarios
      await this.testErrorScenarios();
      
      // Test complex scenarios
      await this.testComplexScenarios();
      
      console.log('✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Tests failed:', error.message);
    } finally {
      // Cleanup created test data
      await this.cleanup();
    }
  }

  async testHealthCheck() {
    console.log('\n📋 Testing Health Check...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check passed:', response.data.status);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  async testCreateProductOrder() {
    console.log('\n📦 Testing Create Product Order...');
    
    try {
      // Test creating basic product order
      const response1 = await axios.post(`${FULL_BASE_URL}/productOrder`, sampleProductOrder1);
      console.log('✅ Created basic product order:', response1.data.id);
      this.createdOrderIds.push(response1.data.id);
      
      // Test creating enterprise product order
      const response2 = await axios.post(`${FULL_BASE_URL}/productOrder`, sampleProductOrder2);
      console.log('✅ Created enterprise product order:', response2.data.id);
      this.createdOrderIds.push(response2.data.id);
      
      // Test creating configurable product order
      const response3 = await axios.post(`${FULL_BASE_URL}/productOrder`, sampleConfigurableProductOrder);
      console.log('✅ Created configurable product order:', response3.data.id);
      this.createdOrderIds.push(response3.data.id);
      
      // Validate response structure
      this.validateProductOrderResponse(response1.data);
      
    } catch (error) {
      console.error('❌ Create product order failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetProductOrders() {
    console.log('\n📋 Testing Get Product Orders...');
    
    try {
      // Test basic list
      const response1 = await axios.get(`${FULL_BASE_URL}/productOrder`);
      console.log(`✅ Retrieved ${response1.data.length} product orders`);
      
      // Test with filters
      const response2 = await axios.get(`${FULL_BASE_URL}/productOrder?state=acknowledged&limit=5`);
      console.log(`✅ Retrieved ${response2.data.length} acknowledged orders`);
      
      // Test with field selection
      const response3 = await axios.get(`${FULL_BASE_URL}/productOrder?fields=id,state,category`);
      console.log(`✅ Retrieved orders with selected fields`);
      
      // Test pagination
      const response4 = await axios.get(`${FULL_BASE_URL}/productOrder?offset=0&limit=2`);
      console.log(`✅ Retrieved paginated orders: ${response4.data.length} items`);
      
    } catch (error) {
      console.error('❌ Get product orders failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetProductOrderById() {
    console.log('\n🔍 Testing Get Product Order by ID...');
    
    if (this.createdOrderIds.length === 0) {
      console.log('⚠️ No orders to test - skipping');
      return;
    }
    
    try {
      const orderId = this.createdOrderIds[0];
      const response = await axios.get(`${FULL_BASE_URL}/productOrder/${orderId}`);
      console.log('✅ Retrieved product order by ID:', response.data.id);
      
      // Test with field selection
      const response2 = await axios.get(`${FULL_BASE_URL}/productOrder/${orderId}?fields=id,state,description`);
      console.log('✅ Retrieved product order with selected fields');
      
    } catch (error) {
      console.error('❌ Get product order by ID failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testUpdateProductOrder() {
    console.log('\n✏️ Testing Update Product Order...');
    
    if (this.createdOrderIds.length === 0) {
      console.log('⚠️ No orders to test - skipping');
      return;
    }
    
    try {
      const orderId = this.createdOrderIds[0];
      
      // Test updating description
      const updateData = {
        description: "Updated product order description",
        priority: "2"
      };
      
      const response = await axios.patch(`${FULL_BASE_URL}/productOrder/${orderId}`, updateData);
      console.log('✅ Updated product order:', response.data.id);
      
      // Verify the update
      if (response.data.description === updateData.description) {
        console.log('✅ Update verification passed');
      } else {
        console.log('❌ Update verification failed');
      }
      
    } catch (error) {
      console.error('❌ Update product order failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testCreateCancelProductOrder() {
    console.log('\n🚫 Testing Create Cancel Product Order...');
    
    if (this.createdOrderIds.length === 0) {
      console.log('⚠️ No orders to cancel - skipping');
      return;
    }
    
    try {
      const orderIdToCancel = this.createdOrderIds[1]; // Use second order
      
      const cancelData = {
        ...sampleCancelProductOrder,
        productOrder: {
          id: orderIdToCancel,
          "@type": "ProductOrderRef",
          "@referredType": "ProductOrder"
        }
      };
      
      const response = await axios.post(`${FULL_BASE_URL}/cancelProductOrder`, cancelData);
      console.log('✅ Created cancel product order:', response.data.id);
      this.createdCancelOrderIds.push(response.data.id);
      
    } catch (error) {
      console.error('❌ Create cancel product order failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetCancelProductOrders() {
    console.log('\n📋 Testing Get Cancel Product Orders...');
    
    try {
      const response = await axios.get(`${FULL_BASE_URL}/cancelProductOrder`);
      console.log(`✅ Retrieved ${response.data.length} cancel product orders`);
      
    } catch (error) {
      console.error('❌ Get cancel product orders failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetCancelProductOrderById() {
    console.log('\n🔍 Testing Get Cancel Product Order by ID...');
    
    if (this.createdCancelOrderIds.length === 0) {
      console.log('⚠️ No cancel orders to test - skipping');
      return;
    }
    
    try {
      const cancelOrderId = this.createdCancelOrderIds[0];
      const response = await axios.get(`${FULL_BASE_URL}/cancelProductOrder/${cancelOrderId}`);
      console.log('✅ Retrieved cancel product order by ID:', response.data.id);
      
    } catch (error) {
      console.error('❌ Get cancel product order by ID failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testErrorScenarios() {
    console.log('\n❌ Testing Error Scenarios...');
    
    try {
      // Test 404 - Non-existent order
      try {
        await axios.get(`${FULL_BASE_URL}/productOrder/non-existent-id`);
        console.log('❌ Should have returned 404 for non-existent order');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ 404 error handled correctly for non-existent order');
        } else {
          throw error;
        }
      }
      
      // Test 400 - Invalid order data
      try {
        await axios.post(`${FULL_BASE_URL}/productOrder`, { invalid: 'data' });
        console.log('❌ Should have returned 400 for invalid data');
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('✅ 400 error handled correctly for invalid data');
        } else {
          throw error;
        }
      }
      
      // Test invalid query parameters
      try {
        await axios.get(`${FULL_BASE_URL}/productOrder?limit=999`);
        console.log('❌ Should have returned 400 for invalid limit');
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('✅ 400 error handled correctly for invalid limit');
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Error scenario testing failed:', error.message);
      throw error;
    }
  }

  async testComplexScenarios() {
    console.log('\n🧩 Testing Complex Scenarios...');
    
    try {
      // Test creating order with complex characteristics
      const complexOrder = {
        "category": "B2B product order",
        "description": "Complex multi-item order with relationships",
        "productOrderItem": [
          {
            "id": "main-service",
            "action": "add",
            "quantity": 1,
            "productOffering": {
              "id": "MAIN-SVC-001",
              "name": "Main Service",
              "@type": "ProductOfferingRef"
            },
            "@type": "ProductOrderItem"
          },
          {
            "id": "addon-service-1",
            "action": "add",
            "quantity": 2,
            "productOffering": {
              "id": "ADDON-001",
              "name": "Add-on Service 1",
              "@type": "ProductOfferingRef"
            },
            "productOrderItemRelationship": [
              {
                "id": "main-service",
                "relationshipType": "reliesOn",
                "@type": "OrderItemRelationship"
              }
            ],
            "@type": "ProductOrderItem"
          }
        ],
        "relatedParty": [
          {
            "role": "customer",
            "partyOrPartyRole": {
              "id": "complex-customer-001",
              "name": "Complex Test Customer",
              "@type": "PartyRef",
              "@referredType": "Organization"
            },
            "@type": "RelatedPartyRefOrPartyRoleRef"
          }
        ],
        "@type": "ProductOrder"
      };
      
      const response = await axios.post(`${FULL_BASE_URL}/productOrder`, complexOrder);
      console.log('✅ Created complex product order:', response.data.id);
      this.createdOrderIds.push(response.data.id);
      
      // Test state transitions
      const updateResponse = await axios.patch(`${FULL_BASE_URL}/productOrder/${response.data.id}`, {
        state: "inProgress"
      });
      console.log('✅ Updated order state to inProgress');
      
    } catch (error) {
      console.error('❌ Complex scenario testing failed:', error.response?.data || error.message);
      throw error;
    }
  }

  validateProductOrderResponse(order) {
    const requiredFields = ['id', 'href', 'state', 'creationDate', 'productOrderItem', '@type'];
    const missingFields = requiredFields.filter(field => !(field in order));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in response: ${missingFields.join(', ')}`);
    }
    
    if (order['@type'] !== 'ProductOrder') {
      throw new Error(`Invalid @type: expected 'ProductOrder', got '${order['@type']}'`);
    }
    
    console.log('✅ Product order response validation passed');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete created product orders
    for (const orderId of this.createdOrderIds) {
      try {
        await axios.delete(`${FULL_BASE_URL}/productOrder/${orderId}`);
        console.log(`✅ Deleted product order: ${orderId}`);
      } catch (error) {
        console.log(`⚠️ Could not delete order ${orderId}:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('🧹 Cleanup completed');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new TMF622APITester();
  tester.runTests().catch(console.error);
}

module.exports = TMF622APITester;