const { v4: uuidv4 } = require('uuid');

class ProductOrderController {
  constructor() {
    // In-memory storage for demo purposes
    this.productOrders = new Map();
    this.cancelProductOrders = new Map();
    
    console.log('✅ ProductOrderController initialized');
  }

  /**
   * Create a new product order (POST /productOrder)
   */
  async createProductOrder(req, res) {
    try {
      console.log('📝 Creating product order with data:', JSON.stringify(req.body, null, 2));
      
      const orderData = req.body;
      
      // Generate unique ID
      const orderId = uuidv4();
      const currentTime = new Date().toISOString();

      // Create the product order with TMF622 compliant structure
      const productOrder = {
        "@type": "ProductOrder",  // ALWAYS FIRST
        id: orderId,
        href: `${req.protocol}://${req.get('host')}/productOrderingManagement/v4/productOrder/${orderId}`,
        category: orderData.category || "B2C product order",
        description: orderData.description || "",
        externalId: orderData.externalId || [],
        priority: orderData.priority || "4",
        state: "acknowledged",
        orderDate: currentTime,
        creationDate: currentTime,
        requestedStartDate: orderData.requestedStartDate || currentTime,
        requestedCompletionDate: orderData.requestedCompletionDate || currentTime,
        expectedCompletionDate: orderData.expectedCompletionDate,
        completionDate: null,
        channel: orderData.channel || [],
        note: orderData.note || [],
        productOrderItem: this.processProductOrderItems(orderData.productOrderItem || [], req),
        relatedParty: orderData.relatedParty || [],
        orderTotalPrice: this.calculateOrderTotalPrice(orderData.productOrderItem || []),
        payment: orderData.payment || [],
        billingAccount: orderData.billingAccount,
        agreement: orderData.agreement,
        quote: orderData.quote,
        productOfferingQualification: orderData.productOfferingQualification
      };

      // Store the order
      this.productOrders.set(orderId, productOrder);
      
      console.log('✅ Product order created with ID:', orderId);
      console.log('🔍 Response @type:', productOrder['@type']);

      // Return 201 Created with the product order
      res.status(201).json(productOrder);

    } catch (error) {
      console.error('❌ Error creating product order:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  /**
   * Get all product orders or a specific one (GET /productOrder)
   */
  async getProductOrders(req, res) {
    try {
      console.log('📋 Getting product orders with query:', req.query);
      
      const { fields, ...filters } = req.query;
      
      // Get all orders as array
      let orders = Array.from(this.productOrders.values());
      
      console.log(`📊 Found ${orders.length} total orders`);

      // Apply filters
      if (Object.keys(filters).length > 0) {
        orders = this.applyFilters(orders, filters);
        console.log(`🔍 After filtering: ${orders.length} orders`);
      }

      // Apply field selection - CRITICAL FIX
      if (fields) {
        const selectedFields = fields.split(',').map(f => f.trim());
        console.log(`🎯 Requested fields: ${selectedFields.join(', ')}`);
        
        orders = orders.map(order => {
          console.log(`🔍 Original order @type: ${order['@type']}`);
          console.log(`🔍 Original order keys: ${Object.keys(order).join(', ')}`);
          
          const selected = this.selectFields(order, selectedFields);
          
          console.log(`🔍 Selected order @type: ${selected['@type']}`);
          console.log(`🔍 Selected order keys: ${Object.keys(selected).join(', ')}`);
          
          return selected;
        });
      }

      // Add pagination headers if needed
      const totalCount = orders.length;
      res.set('X-Total-Count', totalCount.toString());
      res.set('X-Result-Count', orders.length.toString());

      console.log('🚀 Sending response:', JSON.stringify(orders, null, 2));
      res.status(200).json(orders);

    } catch (error) {
      console.error('❌ Error getting product orders:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  /**
   * Get a specific product order by ID (GET /productOrder/{id})
   */
  async getProductOrderById(req, res) {
    try {
      const { id } = req.params;
      const { fields } = req.query;
      
      console.log(`🔍 Getting product order by ID: ${id}`);
      console.log(`🔍 Requested fields: ${fields || 'all'}`);
      
      const productOrder = this.productOrders.get(id);
      
      if (!productOrder) {
        console.log(`❌ Product order not found: ${id}`);
        return res.status(404).json({
          "@type": "Error",
          code: "404",
          reason: "Not Found",
          message: `Product order with id ${id} not found`
        });
      }

      let result = { ...productOrder };
      
      console.log(`🔍 Original product order @type: ${result['@type']}`);
      console.log(`🔍 Original product order keys: ${Object.keys(result).join(', ')}`);

      // Apply field selection - CRITICAL FIX
      if (fields) {
        const selectedFields = fields.split(',').map(f => f.trim());
        console.log(`🎯 Applying field selection: ${selectedFields.join(', ')}`);
        result = this.selectFields(result, selectedFields);
        console.log(`🔍 After field selection @type: ${result['@type']}`);
        console.log(`🔍 After field selection keys: ${Object.keys(result).join(', ')}`);
      }

      console.log(`✅ Found product order: ${id}`);
      console.log('🚀 Sending response:', JSON.stringify(result, null, 2));
      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error getting product order by ID:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500", 
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  /**
   * Update a product order (PATCH /productOrder/{id})
   */
  async updateProductOrder(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log(`📝 Updating product order ${id} with:`, updates);
      
      const existingOrder = this.productOrders.get(id);
      
      if (!existingOrder) {
        return res.status(404).json({
          "@type": "Error",
          code: "404",
          reason: "Not Found", 
          message: `Product order with id ${id} not found`
        });
      }

      // Merge updates with existing order
      const updatedOrder = {
        "@type": "ProductOrder",  // ENSURE @type is always first
        ...existingOrder,
        ...updates,
        id: id, // Ensure ID doesn't change
        lastUpdate: new Date().toISOString()
      };

      // Update state if provided
      if (updates.state) {
        updatedOrder.state = updates.state;
        
        // Set completion date if state is completed
        if (updates.state === 'completed') {
          updatedOrder.completionDate = new Date().toISOString();
        }
      }

      this.productOrders.set(id, updatedOrder);
      
      console.log(`✅ Product order updated: ${id}`);

      res.status(200).json(updatedOrder);

    } catch (error) {
      console.error('❌ Error updating product order:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  /**
   * Delete a product order (DELETE /productOrder/{id})
   */
  async deleteProductOrder(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ Deleting product order: ${id}`);
      
      const productOrder = this.productOrders.get(id);
      
      if (!productOrder) {
        return res.status(404).json({
          "@type": "Error",
          code: "404",
          reason: "Not Found",
          message: `Product order with id ${id} not found`
        });
      }

      // Check if order can be deleted
      if (['inProgress', 'completed'].includes(productOrder.state)) {
        return res.status(409).json({
          "@type": "Error",
          code: "409",
          reason: "Conflict",
          message: `Cannot delete product order in ${productOrder.state} state`
        });
      }

      this.productOrders.delete(id);
      
      console.log(`✅ Product order deleted: ${id}`);
      
      res.status(204).send();

    } catch (error) {
      console.error('❌ Error deleting product order:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error", 
        message: error.message
      });
    }
  }

  /**
   * Create a cancel product order (POST /cancelProductOrder)
   */
  async createCancelProductOrder(req, res) {
    try {
      console.log('📝 Creating cancel product order:', req.body);
      
      const cancelData = req.body;
      
      const cancelId = uuidv4();
      const currentTime = new Date().toISOString();

      const cancelProductOrder = {
        "@type": "CancelProductOrder",
        id: cancelId,
        href: `${req.protocol}://${req.get('host')}/productOrderingManagement/v4/cancelProductOrder/${cancelId}`,
        state: "acknowledged",
        creationDate: currentTime,
        cancellationReason: cancelData.cancellationReason || "",
        requestedCancellationDate: cancelData.requestedCancellationDate || currentTime,
        effectiveCancellationDate: null,
        productOrder: cancelData.productOrder || {}
      };

      // Store the cancellation request
      this.cancelProductOrders.set(cancelId, cancelProductOrder);

      // Update the original product order state if it exists
      if (cancelData.productOrder && cancelData.productOrder.id) {
        const originalOrder = this.productOrders.get(cancelData.productOrder.id);
        if (originalOrder) {
          originalOrder.state = 'cancelled';
          originalOrder.completionDate = currentTime;
          this.productOrders.set(cancelData.productOrder.id, originalOrder);
          console.log(`✅ Original order ${cancelData.productOrder.id} marked as cancelled`);
        }
      }

      console.log(`✅ Cancel product order created: ${cancelId}`);

      res.status(201).json(cancelProductOrder);

    } catch (error) {
      console.error('❌ Error creating cancel product order:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  /**
   * Get cancel product orders (GET /cancelProductOrder)
   */
  async getCancelProductOrders(req, res) {
    try {
      console.log('📋 Getting cancel product orders with query:', req.query);
      
      const { fields, ...filters } = req.query;
      
      let cancelOrders = Array.from(this.cancelProductOrders.values());

      // Apply filters
      if (Object.keys(filters).length > 0) {
        cancelOrders = this.applyFilters(cancelOrders, filters);
      }

      // Apply field selection
      if (fields) {
        const selectedFields = fields.split(',').map(f => f.trim());
        cancelOrders = cancelOrders.map(order => this.selectFields(order, selectedFields));
      }

      console.log(`✅ Found ${cancelOrders.length} cancel orders`);

      res.status(200).json(cancelOrders);

    } catch (error) {
      console.error('❌ Error getting cancel product orders:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  /**
   * Get a specific cancel product order by ID (GET /cancelProductOrder/{id})
   */
  async getCancelProductOrderById(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`🔍 Getting cancel product order by ID: ${id}`);
      
      const cancelOrder = this.cancelProductOrders.get(id);
      
      if (!cancelOrder) {
        return res.status(404).json({
          "@type": "Error",
          code: "404",
          reason: "Not Found",
          message: `Cancel product order with id ${id} not found`
        });
      }

      console.log(`✅ Found cancel product order: ${id}`);

      res.status(200).json(cancelOrder);

    } catch (error) {
      console.error('❌ Error getting cancel product order by ID:', error);
      res.status(500).json({
        "@type": "Error",
        code: "500",
        reason: "Internal Server Error",
        message: error.message
      });
    }
  }

  // Helper methods

  /**
   * Process product order items to ensure TMF622 compliance
   */
  processProductOrderItems(items, req) {
    if (!Array.isArray(items)) return [];

    return items.map(item => ({
      "@type": "ProductOrderItem",
      id: item.id || uuidv4(),
      quantity: item.quantity || 1,
      action: item.action || "add",
      state: "acknowledged",
      appointment: item.appointment,
      billingAccount: item.billingAccount,
      product: this.processProduct(item.product, req),
      productOffering: item.productOffering,
      productOfferingQualificationItem: item.productOfferingQualificationItem,
      productOrderItemRelationship: item.productOrderItemRelationship || [],
      itemPrice: item.itemPrice || [],
      itemTotalPrice: item.itemTotalPrice,
      itemTerm: item.itemTerm || [],
      note: item.note || [],
      payment: item.payment || [],
      qualification: item.qualification,
      quoteItem: item.quoteItem
    }));
  }

  /**
   * Process product to ensure TMF622 compliance
   */
  processProduct(product, req) {
    if (!product) return undefined;

    return {
      "@type": "Product",
      ...product,
      id: product.id || uuidv4(),
      href: product.href || `${req.protocol}://${req.get('host')}/productInventoryManagement/v4/product/${product.id || uuidv4()}`,
      isBundle: product.isBundle || false,
      productCharacteristic: product.productCharacteristic || [],
      productRelationship: product.productRelationship || [],
      realizingResource: product.realizingResource || [],
      realizingService: product.realizingService || [],
      relatedParty: product.relatedParty || []
    };
  }

  /**
   * Calculate order total price
   */
  calculateOrderTotalPrice(items) {
    if (!Array.isArray(items) || items.length === 0) return undefined;

    // Simple calculation - sum all item prices
    let totalValue = 0;
    let currency = "LKR";

    items.forEach(item => {
      if (item.itemPrice && Array.isArray(item.itemPrice)) {
        item.itemPrice.forEach(price => {
          if (price.price && price.price.taxIncludedAmount) {
            totalValue += price.price.taxIncludedAmount.value || 0;
            currency = price.price.taxIncludedAmount.unit || currency;
          }
        });
      }
    });

    if (totalValue === 0) return undefined;

    return {
      "@type": "OrderPrice",
      description: "Total order price",
      name: "OrderTotal",
      priceType: "total",
      price: {
        "@type": "Price",
        taxIncludedAmount: {
          unit: currency,
          value: totalValue
        },
        dutyFreeAmount: {
          unit: currency,
          value: Math.round(totalValue / 1.15) // Assuming 15% tax
        },
        taxRate: 15
      }
    };
  }

  /**
   * Apply filters to orders
   */
  applyFilters(orders, filters) {
    return orders.filter(order => {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'offset' || key === 'limit' || key === 'fields') continue;
        
        console.log(`🔍 Filtering: ${key} = ${value}`);
        
        // Handle nested properties with dot notation
        const orderValue = this.getNestedProperty(order, key);
        
        console.log(`🔍 Order value for ${key}: ${orderValue}`);
        
        // Skip if the property doesn't exist in the order
        if (orderValue === undefined) {
          console.log(`⚠️  Property ${key} not found in order, skipping`);
          continue;
        }
        
        // Handle null values specifically
        if (orderValue === null) {
          // If filtering for null and order value is null, it matches
          if (value === 'null' || value === null) {
            console.log(`✅ Null match for ${key}`);
            continue;
          } else {
            console.log(`❌ Null mismatch for ${key}`);
            return false;
          }
        }
        
        // Handle date filtering
        if (key.includes('Date') && typeof orderValue === 'string') {
          try {
            const orderDate = new Date(orderValue);
            const filterDate = new Date(value);
            if (orderDate.toDateString() !== filterDate.toDateString()) {
              console.log(`❌ Date mismatch for ${key}`);
              return false;
            } else {
              console.log(`✅ Date match for ${key}`);
            }
          } catch (error) {
            console.log(`⚠️  Date parsing error for ${key}: ${error.message}`);
            return false;
          }
        } else {
          // Convert both to strings for comparison, handling null safely
          const orderValueStr = orderValue !== null ? orderValue.toString().toLowerCase() : 'null';
          const filterValueStr = value !== null ? value.toString().toLowerCase() : 'null';
          
          if (orderValueStr !== filterValueStr) {
            console.log(`❌ Value mismatch for ${key}: ${orderValueStr} !== ${filterValueStr}`);
            return false;
          } else {
            console.log(`✅ Value match for ${key}`);
          }
        }
      }
      return true;
    });
  }

  /**
   * CRITICAL FIX: Select specific fields from an object
   * This method ensures @type is ALWAYS included
   */
  selectFields(obj, fields) {
    console.log(`🎯 selectFields called with:`);
    console.log(`   Object @type: ${obj['@type']}`);
    console.log(`   Requested fields: ${fields.join(', ')}`);
    
    // If no fields specified, return the whole object
    if (!fields || fields.length === 0) {
      console.log(`   No field selection, returning full object`);
      return obj;
    }

    // ALWAYS include these critical fields
    const result = {
      "@type": obj["@type"],  // ALWAYS FIRST
      id: obj.id,             // ALWAYS INCLUDE
      href: obj.href          // ALWAYS INCLUDE
    };

    // Add the specifically requested fields
    fields.forEach(field => {
      if (obj.hasOwnProperty(field) && field !== '@type' && field !== 'id' && field !== 'href') {
        result[field] = obj[field];
      }
    });

    console.log(`   Result @type: ${result['@type']}`);
    console.log(`   Result keys: ${Object.keys(result).join(', ')}`);
    
    return result;
  }

  /**
   * Get nested property value using dot notation
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

module.exports = ProductOrderController;