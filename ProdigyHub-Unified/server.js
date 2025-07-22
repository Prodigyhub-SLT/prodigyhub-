require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const database = require('./src/config/database');

// Import MongoDB-enabled TMF760 routes
const tmf760Routes = require('./routes/tmf760Routes');

const app = express();
const PORT = process.env.PORT || 10000; // Render uses port 10000

// ===================================
// MIDDLEWARE SETUP
// ===================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for unified API
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS - Enhanced for all APIs
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    process.env.ALLOWED_ORIGINS?.split(',') : 
    ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', '*'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Result-Count', 'X-Request-ID']
}));

// Enhanced CORS for TMF compliance
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // TMF headers
  res.setHeader('X-API-Version', 'v4-v5');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Request ID middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ===================================
// INITIALIZE CONTROLLERS
// ===================================

// TMF637 - Product Inventory Management
class ProductInventoryController {
  constructor() {
    this.products = [];
    this.hubs = [];
  }

  generateId(prefix) {
    return `${prefix}-${uuidv4()}`;
  }

  ensureString(value, defaultValue = '') {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }

  getAllProducts(req, res) {
    let result = [...this.products];

    if (req.query.id) {
      result = result.filter(p => p.id === req.query.id);
    }

    if (req.query.status) {
      result = result.filter(p => p.status === req.query.status);
    }

    if (req.query.fields) {
      const fields = req.query.fields.split(',').map(f => f.trim());
      const mandatoryFields = ['id', 'href', '@type'];
      const allFields = [...new Set([...fields, ...mandatoryFields])];
      
      result = result.map(product => {
        const filtered = {};
        allFields.forEach(field => {
          if (product.hasOwnProperty(field)) {
            filtered[field] = product[field];
          }
        });
        return filtered;
      });
    }

    res.status(200).json(result);
  }

  getProductById(req, res) {
    const productId = req.params.id;
    const product = this.products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `Product with id ${productId} does not exist`
      });
    }

    let result = { ...product };

    if (req.query.fields) {
      const fields = req.query.fields.split(',').map(f => f.trim());
      const mandatoryFields = ['id', 'href', '@type'];
      const allFields = [...new Set([...fields, ...mandatoryFields])];
      
      const filtered = {};
      allFields.forEach(field => {
        if (product.hasOwnProperty(field)) {
          filtered[field] = product[field];
        }
      });
      result = filtered;
    }

    res.status(200).json(result);
  }

  createProduct(req, res) {
    const data = req.body;
    const id = this.generateId('prod');
    const timestamp = new Date().toISOString();

    const newProduct = {
      id: id,
      href: `http://localhost:${PORT}/tmf-api/product/${id}`,
      name: this.ensureString(data.name, 'Default Product Name'),
      description: this.ensureString(data.description, 'Default product description'),
      status: this.ensureString(data.status, 'created'),
      creationDate: timestamp,
      lastUpdate: timestamp,
      startDate: this.ensureString(data.startDate, timestamp),
      terminationDate: this.ensureString(data.terminationDate, ''),
      isBundle: Boolean(data.isBundle),
      isCustomerVisible: data.isCustomerVisible !== undefined ? Boolean(data.isCustomerVisible) : true,
      productSerialNumber: this.ensureString(data.productSerialNumber, ''),
      '@type': 'Product',
      '@baseType': 'BaseProduct',
      '@schemaLocation': 'http://example.com/schema/Product',
      relatedParty: Array.isArray(data.relatedParty) ? data.relatedParty : [],
      productCharacteristic: Array.isArray(data.productCharacteristic) ? data.productCharacteristic : [],
      productPrice: Array.isArray(data.productPrice) ? data.productPrice : [],
      productRelationship: Array.isArray(data.productRelationship) ? data.productRelationship : [],
      place: Array.isArray(data.place) ? data.place : [],
      productOrderItem: Array.isArray(data.productOrderItem) ? data.productOrderItem : [],
      realizingResource: Array.isArray(data.realizingResource) ? data.realizingResource : [],
      realizingService: Array.isArray(data.realizingService) ? data.realizingService : [],
      agreementItem: Array.isArray(data.agreementItem) ? data.agreementItem : []
    };

    // Add optional complex objects if provided
    if (data.productSpecification) {
      newProduct.productSpecification = {
        id: this.ensureString(data.productSpecification.id, 'default-spec-id'),
        href: this.ensureString(data.productSpecification.href, `http://localhost:${PORT}/productSpecification/${data.productSpecification.id || 'default-spec-id'}`),
        name: this.ensureString(data.productSpecification.name, 'Default Specification'),
        version: this.ensureString(data.productSpecification.version, '1.0'),
        ...data.productSpecification
      };
    }

    this.products.push(newProduct);
    res.status(201).json(newProduct);
  }

  updateProduct(req, res) {
    const productId = req.params.id;
    const productIndex = this.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `Product with id ${productId} does not exist`
      });
    }

    const updatedProduct = {
      ...this.products[productIndex],
      ...req.body,
      id: productId,
      lastUpdate: new Date().toISOString()
    };

    updatedProduct.name = this.ensureString(updatedProduct.name, 'Updated Product Name');
    updatedProduct.description = this.ensureString(updatedProduct.description, 'Updated description');
    updatedProduct.status = this.ensureString(updatedProduct.status, 'active');

    this.products[productIndex] = updatedProduct;
    res.status(200).json(updatedProduct);
  }

  deleteProduct(req, res) {
    const productId = req.params.id;
    const productIndex = this.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `Product with id ${productId} does not exist`
      });
    }

    this.products.splice(productIndex, 1);
    res.status(204).send();
  }

  createHub(req, res) {
    const { callback } = req.body;
    
    if (!callback) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Callback URL is required' 
      });
    }

    const hubId = this.generateId('hub');
    const newHub = { 
      id: hubId, 
      callback: this.ensureString(callback),
      creationDate: new Date().toISOString()
    };
    
    this.hubs.push(newHub);
    res.status(201).json(newHub);
  }

  deleteHub(req, res) {
    const hubId = req.params.id;
    const hubIndex = this.hubs.findIndex(h => h.id === hubId);
    
    if (hubIndex === -1) {
      return res.status(404).json({ 
        error: 'Hub not found',
        message: `Hub with id ${hubId} does not exist`
      });
    }

    this.hubs.splice(hubIndex, 1);
    res.status(204).send();
  }
}

// TMF622 - Product Ordering Management
class ProductOrderController {
  constructor() {
    this.productOrders = new Map();
    this.cancelProductOrders = new Map();
    console.log('✅ ProductOrderController initialized');
  }

  async createProductOrder(req, res) {
    try {
      console.log('📝 Creating product order with data:', JSON.stringify(req.body, null, 2));
      
      const orderData = req.body;
      const orderId = uuidv4();
      const currentTime = new Date().toISOString();

      const productOrder = {
        "@type": "ProductOrder",
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

      this.productOrders.set(orderId, productOrder);
      
      console.log('✅ Product order created with ID:', orderId);
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

  async getProductOrders(req, res) {
    try {
      console.log('📋 Getting product orders with query:', req.query);
      
      const { fields, ...filters } = req.query;
      let orders = Array.from(this.productOrders.values());
      
      console.log(`📊 Found ${orders.length} total orders`);

      if (Object.keys(filters).length > 0) {
        orders = this.applyFilters(orders, filters);
        console.log(`🔍 After filtering: ${orders.length} orders`);
      }

      if (fields) {
        const selectedFields = fields.split(',').map(f => f.trim());
        console.log(`🎯 Requested fields: ${selectedFields.join(', ')}`);
        
        orders = orders.map(order => {
          return this.selectFields(order, selectedFields);
        });
      }

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

  async getProductOrderById(req, res) {
    try {
      const { id } = req.params;
      const { fields } = req.query;
      
      console.log(`🔍 Getting product order by ID: ${id}`);
      
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
      
      if (fields) {
        const selectedFields = fields.split(',').map(f => f.trim());
        console.log(`🎯 Applying field selection: ${selectedFields.join(', ')}`);
        result = this.selectFields(result, selectedFields);
      }

      console.log(`✅ Found product order: ${id}`);
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

      const updatedOrder = {
        "@type": "ProductOrder",
        ...existingOrder,
        ...updates,
        id: id,
        lastUpdate: new Date().toISOString()
      };

      if (updates.state) {
        updatedOrder.state = updates.state;
        
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

      this.cancelProductOrders.set(cancelId, cancelProductOrder);

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

  async getCancelProductOrders(req, res) {
    try {
      console.log('📋 Getting cancel product orders with query:', req.query);
      
      const { fields, ...filters } = req.query;
      let cancelOrders = Array.from(this.cancelProductOrders.values());

      if (Object.keys(filters).length > 0) {
        cancelOrders = this.applyFilters(cancelOrders, filters);
      }

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

  calculateOrderTotalPrice(items) {
    if (!Array.isArray(items) || items.length === 0) return undefined;

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
          value: Math.round(totalValue / 1.15)
        },
        taxRate: 15
      }
    };
  }

  applyFilters(orders, filters) {
    return orders.filter(order => {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'offset' || key === 'limit' || key === 'fields') continue;
        
        const orderValue = this.getNestedProperty(order, key);
        
        if (orderValue === undefined) {
          continue;
        }
        
        if (orderValue === null) {
          if (value === 'null' || value === null) {
            continue;
          } else {
            return false;
          }
        }
        
        if (key.includes('Date') && typeof orderValue === 'string') {
          try {
            const orderDate = new Date(orderValue);
            const filterDate = new Date(value);
            if (orderDate.toDateString() !== filterDate.toDateString()) {
              return false;
            }
          } catch (error) {
            return false;
          }
        } else {
          const orderValueStr = orderValue !== null ? orderValue.toString().toLowerCase() : 'null';
          const filterValueStr = value !== null ? value.toString().toLowerCase() : 'null';
          
          if (orderValueStr !== filterValueStr) {
            return false;
          }
        }
      }
      return true;
    });
  }

  selectFields(obj, fields) {
    if (!fields || fields.length === 0) {
      return obj;
    }

    const result = {
      "@type": obj["@type"],
      id: obj.id,
      href: obj.href
    };

    fields.forEach(field => {
      if (obj.hasOwnProperty(field) && field !== '@type' && field !== 'id' && field !== 'href') {
        result[field] = obj[field];
      }
    });
    
    return result;
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

// TMF688 - Event Management Controllers
class EventController {
  constructor() {
    this.events = new Map();
  }

  getAllEvents(req, res) {
    try {
      const { eventType, domain, priority, page = 1, limit = 10 } = req.query;
      
      let events = Array.from(this.events.values());
      
      if (eventType || domain || priority) {
        events = this.filterEvents(events, { eventType, domain, priority });
      }
      
      const result = this.paginate(events, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const deleted = this.events.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Event not found', 
          message: `Event with id ${id} does not exist` 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  filterEvents(events, filters) {
    let filtered = events;

    if (filters.eventType) {
      filtered = filtered.filter(event => 
        event.eventType?.toLowerCase().includes(filters.eventType.toLowerCase())
      );
    }

    if (filters.domain) {
      filtered = filtered.filter(event => 
        event.domain?.toLowerCase().includes(filters.domain.toLowerCase())
      );
    }

    if (filters.priority) {
      filtered = filtered.filter(event => 
        event.priority?.toLowerCase() === filters.priority.toLowerCase()
      );
    }

    return filtered;
  }

  paginate(array, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: array.length,
        totalPages: Math.ceil(array.length / limit)
      }
    };
  }
}

class HubController {
  constructor() {
    this.hubs = new Map();
  }

  getAllHubs(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const hubList = Array.from(this.hubs.values());
      const result = this.paginate(hubList, page, limit);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  getHubById(req, res) {
    try {
      const { id } = req.params;
      const hub = this.hubs.get(id);
      
      if (!hub) {
        return res.status(404).json({ 
          error: 'Hub not found', 
          message: `Hub with id ${id} does not exist` 
        });
      }
      
      res.json(hub);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  createHub(req, res) {
    try {
      const hubData = req.body;
      
      if (!hubData.callback) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'callback is required' 
        });
      }

      const hub = {
        id: uuidv4(),
        '@type': 'Hub',
        href: `http://localhost:${PORT}/tmf-api/event/v4/hub/${uuidv4()}`,
        callback: hubData.callback,
        query: hubData.query
      };
      
      this.hubs.set(hub.id, hub);
      res.status(201).json(hub);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  deleteHub(req, res) {
    try {
      const { id } = req.params;
      const deleted = this.hubs.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Hub not found', 
          message: `Hub with id ${id} does not exist` 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  paginate(array, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: array.length,
        totalPages: Math.ceil(array.length / limit)
      }
    };
  }
}

class TopicController {
  constructor() {
    this.topics = new Map();
  }

  getAllTopics(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const topicList = Array.from(this.topics.values());
      const result = this.paginate(topicList, page, limit);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  getTopicById(req, res) {
    try {
      const { id } = req.params;
      const topic = this.topics.get(id);
      
      if (!topic) {
        return res.status(404).json({ 
          error: 'Topic not found', 
          message: `Topic with id ${id} does not exist` 
        });
      }
      
      res.json(topic);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  createTopic(req, res) {
    try {
      const topicData = req.body;
      
      if (!topicData.name) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'name is required' 
        });
      }

      const topic = {
        id: uuidv4(),
        '@type': 'Topic',
        href: `http://localhost:${PORT}/tmf-api/event/v4/topic/${uuidv4()}`,
        name: topicData.name,
        contentQuery: topicData.contentQuery,
        headerQuery: topicData.headerQuery
      };
      
      this.topics.set(topic.id, topic);
      res.status(201).json(topic);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  deleteTopic(req, res) {
    try {
      const { id } = req.params;
      const deleted = this.topics.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Topic not found', 
          message: `Topic with id ${id} does not exist` 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  paginate(array, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: array.length,
        totalPages: Math.ceil(array.length / limit)
      }
    };
  }
}

// Initialize controllers
const tmf637Controller = new ProductInventoryController();
const tmf622Controller = new ProductOrderController();
const eventController = new EventController();
const hubController = new HubController();  
const topicController = new TopicController();

// In-memory storage for non-MongoDB APIs
const tmf620Storage = {
  categories: new Map(),
  productSpecifications: new Map(),
  productOfferings: new Map(),
  productOfferingPrices: new Map(),
  productCatalogs: new Map(),
  importJobs: new Map(),
  exportJobs: new Map(),
  hubs: new Map()
};

const tmf679Storage = {
  checkQualifications: new Map(),
  queryQualifications: new Map()
};

// ===================================
// MAIN ROUTES & HEALTH CHECK
// ===================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ProdigyHub - Unified TMF API Backend',
    version: '1.0.0',
    description: 'Complete TM Forum API Suite Implementation',
    apis: {
      'TMF620': 'Product Catalog Management',
      'TMF637': 'Product Inventory Management', 
      'TMF679': 'Product Offering Qualification',
      'TMF622': 'Product Ordering Management',
      'TMF688': 'Event Management',
      'TMF760': 'Product Configuration Management (MongoDB)'
    },
    endpoints: {
      productCatalog: '/productCatalogManagement/v5/*',
      productInventory: '/tmf-api/product*',
      productQualification: '/productOfferingQualification/v5/*',
      productOrdering: '/productOrderingManagement/v4/*',
      eventManagement: '/tmf-api/event/v4/*',
      productConfiguration: '/tmf-api/productConfigurationManagement/v5/* (MongoDB)'
    },
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// Enhanced health check with database status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    
    res.json({
      status: 'OK',
      service: 'ProdigyHub Unified TMF API Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: database.isConnected(),
        status: dbHealth.status,
        responseTime: dbHealth.responseTime || 'N/A'
      },
      apis: {
        'TMF620': 'Active (In-Memory)',
        'TMF637': 'Active (In-Memory)',
        'TMF679': 'Active (In-Memory)', 
        'TMF622': 'Active (In-Memory)',
        'TMF688': 'Active (In-Memory)',
        'TMF760': database.isConnected() ? 'Active (MongoDB)' : 'Active (Disabled - MongoDB Not Connected)'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint for storage verification
app.get('/debug/storage', async (req, res) => {
  try {
    if (!database.isConnected()) {
      return res.json({
        storage: 'MongoDB Disconnected',
        connected: false,
        message: 'Database connection not available'
      });
    }

    const CheckProductConfiguration = require('./src/models/CheckProductConfiguration');
    const QueryProductConfiguration = require('./src/models/QueryProductConfiguration');
    
    const checkCount = await CheckProductConfiguration.countDocuments();
    const queryCount = await QueryProductConfiguration.countDocuments();
    
    res.json({
      storage: 'MongoDB',
      connected: database.isConnected(),
      database: database.getStats(),
      collections: {
        checkProductConfigurations: checkCount,
        queryProductConfigurations: queryCount
      },
      environment: process.env.NODE_ENV,
      message: 'TMF760 using MongoDB persistence'
    });
  } catch (error) {
    res.status(500).json({
      storage: 'Error',
      error: error.message,
      connected: database.isConnected()
    });
  }
});

// ===================================
// TMF620 - PRODUCT CATALOG MANAGEMENT
// ===================================

app.get('/productCatalogManagement/v5', (req, res) => {
  res.json({
    name: 'TMF620 Product Catalog Management API',
    version: 'v5',
    description: 'TM Forum Product Catalog Management API implementation',
    paths: [
      { path: '/category', methods: ['GET', 'POST'], description: 'Product Category operations' },
      { path: '/productSpecification', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Product Specification operations' },
      { path: '/productOffering', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Product Offering operations' },
      { path: '/productOfferingPrice', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Product Offering Price operations' },
      { path: '/productCatalog', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Product Catalog operations' },
      { path: '/importJob', methods: ['GET', 'POST', 'DELETE'], description: 'Import Job operations' },
      { path: '/exportJob', methods: ['GET', 'POST', 'DELETE'], description: 'Export Job operations' },
      { path: '/hub', methods: ['GET', 'POST', 'DELETE'], description: 'Notification Hub operations' }
    ],
    timestamp: new Date().toISOString()
  });
});

// TMF620 Category routes
app.get('/productCatalogManagement/v5/category', (req, res) => {
  const categories = Array.from(tmf620Storage.categories.values());
  res.json(categories);
});

app.post('/productCatalogManagement/v5/category', (req, res) => {
  const category = {
    id: uuidv4(),
    href: `http://localhost:${PORT}/productCatalogManagement/v5/category/${uuidv4()}`,
    '@type': 'Category',
    ...req.body
  };
  tmf620Storage.categories.set(category.id, category);
  res.status(201).json(category);
});

app.get('/productCatalogManagement/v5/category/:id', (req, res) => {
  const category = tmf620Storage.categories.get(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

// TMF620 Product Specification routes
app.get('/productCatalogManagement/v5/productSpecification', (req, res) => {
  res.json(Array.from(tmf620Storage.productSpecifications.values()));
});

app.post('/productCatalogManagement/v5/productSpecification', (req, res) => {
  const spec = {
    id: uuidv4(),
    href: `http://localhost:${PORT}/productCatalogManagement/v5/productSpecification/${uuidv4()}`,
    '@type': 'ProductSpecification',
    ...req.body
  };
  tmf620Storage.productSpecifications.set(spec.id, spec);
  res.status(201).json(spec);
});

app.get('/productCatalogManagement/v5/productSpecification/:id', (req, res) => {
  const spec = tmf620Storage.productSpecifications.get(req.params.id);
  if (!spec) {
    return res.status(404).json({ error: 'ProductSpecification not found' });
  }
  res.json(spec);
});

// TMF620 Product Offering routes
app.get('/productCatalogManagement/v5/productOffering', (req, res) => {
  res.json(Array.from(tmf620Storage.productOfferings.values()));
});

app.post('/productCatalogManagement/v5/productOffering', (req, res) => {
  const offering = {
    id: uuidv4(),
    href: `http://localhost:${PORT}/productCatalogManagement/v5/productOffering/${uuidv4()}`,
    '@type': 'ProductOffering',
    ...req.body
  };
  tmf620Storage.productOfferings.set(offering.id, offering);
  res.status(201).json(offering);
});

app.get('/productCatalogManagement/v5/productOffering/:id', (req, res) => {
  const offering = tmf620Storage.productOfferings.get(req.params.id);
  if (!offering) {
    return res.status(404).json({ error: 'ProductOffering not found' });
  }
  res.json(offering);
});

// ===================================
// TMF637 - PRODUCT INVENTORY MANAGEMENT  
// ===================================

app.get('/tmf-api', (req, res) => {
  res.json({
    message: 'TMF637 ProductInventory API is running',
    version: '5.0.0',
    endpoints: [
      'GET /tmf-api/product - List all products',
      'GET /tmf-api/product/{id} - Get specific product', 
      'POST /tmf-api/product - Create new product',
      'PATCH /tmf-api/product/{id} - Update existing product',
      'DELETE /tmf-api/product/{id} - Delete product',
      'POST /tmf-api/hub - Register notification hub',
      'DELETE /tmf-api/hub/{id} - Unregister notification hub'
    ]
  });
});

app.get('/tmf-api/product', (req, res) => tmf637Controller.getAllProducts(req, res));
app.get('/tmf-api/product/:id', (req, res) => tmf637Controller.getProductById(req, res));
app.post('/tmf-api/product', (req, res) => tmf637Controller.createProduct(req, res));
app.patch('/tmf-api/product/:id', (req, res) => tmf637Controller.updateProduct(req, res));
app.delete('/tmf-api/product/:id', (req, res) => tmf637Controller.deleteProduct(req, res));

app.post('/tmf-api/hub', (req, res) => tmf637Controller.createHub(req, res));
app.delete('/tmf-api/hub/:id', (req, res) => tmf637Controller.deleteHub(req, res));

app.get('/tmf-api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TMF637 Product Inventory API'
  });
});

// ===================================
// TMF679 - PRODUCT OFFERING QUALIFICATION
// ===================================

app.get('/productOfferingQualification/v5', (req, res) => {
  res.json({
    name: 'TMF679 Product Offering Qualification API',
    version: 'v5',
    description: 'TM Forum Product Offering Qualification API implementation',
    paths: [
      { path: '/checkProductOfferingQualification', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Check Product Offering Qualification operations' },
      { path: '/queryProductOfferingQualification', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Query Product Offering Qualification operations' }
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/productOfferingQualification/v5/checkProductOfferingQualification', (req, res) => {
  res.json(Array.from(tmf679Storage.checkQualifications.values()));
});

app.post('/productOfferingQualification/v5/checkProductOfferingQualification', (req, res) => {
  const qualification = {
    id: uuidv4(),
    href: `http://localhost:${PORT}/productOfferingQualification/v5/checkProductOfferingQualification/${uuidv4()}`,
    '@type': 'CheckProductOfferingQualification',
    state: 'acknowledged',
    ...req.body
  };
  tmf679Storage.checkQualifications.set(qualification.id, qualification);
  res.status(201).json(qualification);
});

app.get('/productOfferingQualification/v5/checkProductOfferingQualification/:id', (req, res) => {
  const qualification = tmf679Storage.checkQualifications.get(req.params.id);
  if (!qualification) {
    return res.status(404).json({ error: 'CheckProductOfferingQualification not found' });
  }
  res.json(qualification);
});

app.get('/productOfferingQualification/v5/queryProductOfferingQualification', (req, res) => {
  res.json(Array.from(tmf679Storage.queryQualifications.values()));
});

app.post('/productOfferingQualification/v5/queryProductOfferingQualification', (req, res) => {
  const query = {
    id: uuidv4(),
    href: `http://localhost:${PORT}/productOfferingQualification/v5/queryProductOfferingQualification/${uuidv4()}`,
    '@type': 'QueryProductOfferingQualification',
    state: 'acknowledged',
    ...req.body
  };
  tmf679Storage.queryQualifications.set(query.id, query);
  res.status(201).json(query);
});

app.get('/productOfferingQualification/v5/queryProductOfferingQualification/:id', (req, res) => {
  const query = tmf679Storage.queryQualifications.get(req.params.id);
  if (!query) {
    return res.status(404).json({ error: 'QueryProductOfferingQualification not found' });
  }
  res.json(query);
});

// ===================================
// TMF622 - PRODUCT ORDERING MANAGEMENT
// ===================================

app.get('/productOrderingManagement/v4', (req, res) => {
  res.json({
    name: 'TMF622 Product Ordering Management API',
    version: 'v4',
    paths: [
      { path: '/productOrder', methods: ['GET', 'POST'], description: 'Product Order operations' },
      { path: '/productOrder/{id}', methods: ['GET', 'PATCH', 'DELETE'], description: 'Individual Product Order operations' },
      { path: '/cancelProductOrder', methods: ['GET', 'POST'], description: 'Cancel Product Order operations' },
      { path: '/cancelProductOrder/{id}', methods: ['GET'], description: 'Individual Cancel Product Order operations' }
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/productOrderingManagement/v4/productOrder', async (req, res) => {
  try {
    await tmf622Controller.createProductOrder(req, res);
  } catch (error) {
    console.error('Error in POST /productOrder:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error", 
      message: error.message
    });
  }
});

app.get('/productOrderingManagement/v4/productOrder/:id', async (req, res) => {
  try {
    await tmf622Controller.getProductOrderById(req, res);
  } catch (error) {
    console.error('Error in GET /productOrder/:id:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.get('/productOrderingManagement/v4/productOrder', async (req, res) => {
  try {
    await tmf622Controller.getProductOrders(req, res);
  } catch (error) {
    console.error('Error in GET /productOrder:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.patch('/productOrderingManagement/v4/productOrder/:id', async (req, res) => {
  try {
    await tmf622Controller.updateProductOrder(req, res);
  } catch (error) {
    console.error('Error in PATCH /productOrder/:id:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.delete('/productOrderingManagement/v4/productOrder/:id', async (req, res) => {
  try {
    await tmf622Controller.deleteProductOrder(req, res);
  } catch (error) {
    console.error('Error in DELETE /productOrder/:id:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500", 
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.post('/productOrderingManagement/v4/cancelProductOrder', async (req, res) => {
  try {
    await tmf622Controller.createCancelProductOrder(req, res);
  } catch (error) {
    console.error('Error in POST /cancelProductOrder:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.get('/productOrderingManagement/v4/cancelProductOrder/:id', async (req, res) => {
  try {
    await tmf622Controller.getCancelProductOrderById(req, res);
  } catch (error) {
    console.error('Error in GET /cancelProductOrder/:id:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.get('/productOrderingManagement/v4/cancelProductOrder', async (req, res) => {
  try {
    await tmf622Controller.getCancelProductOrders(req, res);
  } catch (error) {
    console.error('Error in GET /cancelProductOrder:', error);
    res.status(500).json({
      "@type": "Error",
      code: "500",
      reason: "Internal Server Error",
      message: error.message
    });
  }
});

app.get('/productOrderingManagement/v4/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'TMF622 Product Ordering Management API',
    version: 'v4'
  });
});

// ===================================
// TMF688 - EVENT MANAGEMENT
// ===================================

app.get('/tmf-api/event/v4', (req, res) => {
  res.json({
    name: 'TMF688 Event Management API',
    version: 'v4',
    description: 'TM Forum Event Management API implementation',
    paths: [
      { path: '/event', methods: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'Event operations' },
      { path: '/topic', methods: ['GET', 'POST', 'DELETE'], description: 'Topic operations' },
      { path: '/hub', methods: ['GET', 'POST', 'DELETE'], description: 'Hub operations' }
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/tmf-api/event/v4/event', (req, res) => eventController.getAllEvents(req, res));
app.post('/tmf-api/event/v4/event', (req, res) => eventController.createEvent(req, res));
app.get('/tmf-api/event/v4/event/:id', (req, res) => eventController.getEventById(req, res));
app.patch('/tmf-api/event/v4/event/:id', (req, res) => eventController.updateEvent(req, res));
app.delete('/tmf-api/event/v4/event/:id', (req, res) => eventController.deleteEvent(req, res));

app.get('/tmf-api/event/v4/topic', (req, res) => topicController.getAllTopics(req, res));
app.post('/tmf-api/event/v4/topic', (req, res) => topicController.createTopic(req, res));
app.get('/tmf-api/event/v4/topic/:id', (req, res) => topicController.getTopicById(req, res));
app.delete('/tmf-api/event/v4/topic/:id', (req, res) => topicController.deleteTopic(req, res));

app.get('/tmf-api/event/v4/hub', (req, res) => hubController.getAllHubs(req, res));
app.post('/tmf-api/event/v4/hub', (req, res) => hubController.createHub(req, res));
app.get('/tmf-api/event/v4/hub/:id', (req, res) => hubController.getHubById(req, res));
app.delete('/tmf-api/event/v4/hub/:id', (req, res) => hubController.deleteHub(req, res));

// ===================================
// TMF760 - PRODUCT CONFIGURATION MANAGEMENT (MongoDB Only)
// ===================================

// Mount MongoDB-enabled TMF760 routes
app.use('/tmf-api/productConfigurationManagement/v5', tmf760Routes);
console.log('✅ TMF760 Product Configuration Management (MongoDB) mounted');

// ===================================
// ERROR HANDLING & 404
// ===================================

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${req.requestId}] Error:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  let statusCode = err.status || err.statusCode || 500;
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    requestId: req.requestId
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Bad Request',
      message: err.message,
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    };
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse = {
      error: 'Bad Request',
      message: 'Invalid ID format',
      code: 'INVALID_ID_FORMAT',
      requestId: req.requestId
    };
  }

  if (err.code === 11000) {
    statusCode = 409;
    errorResponse = {
      error: 'Conflict',
      message: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
      requestId: req.requestId
    };
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'An unexpected error occurred';
  } else if (statusCode === 500) {
    errorResponse.message = err.message;
  }

  res.status(statusCode).json(errorResponse);
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    requestId: req.requestId,
    availableAPIs: {
      'TMF620': '/productCatalogManagement/v5/',
      'TMF637': '/tmf-api/product',
      'TMF679': '/productOfferingQualification/v5/',
      'TMF622': '/productOrderingManagement/v4/',
      'TMF688': '/tmf-api/event/v4/',
      'TMF760': '/tmf-api/productConfigurationManagement/v5/ (MongoDB)'
    }
  });
});

// ===================================
// SERVER START
// ===================================

async function startServer() {
  try {
    console.log('🚀 Starting ProdigyHub Unified TMF API Backend...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to MongoDB if enabled
    if (process.env.ENABLE_DATABASE === 'true') {
      await database.connect();
      console.log('🗄️ Database: Connected to MongoDB');
    } else {
      console.log('🗄️ Database: Disabled (using in-memory storage)');
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 ProdigyHub Unified TMF API Backend Started');
      console.log('='.repeat(60));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🗄️ Database: ${database.isConnected() ? 'MongoDB Connected' : 'In-Memory Storage'}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📋 Available APIs:');
      console.log('  • TMF620 - Product Catalog: /productCatalogManagement/v5 (In-Memory)');
      console.log('  • TMF622 - Product Ordering: /productOrderingManagement/v4 (In-Memory)');
      console.log('  • TMF637 - Product Inventory: /tmf-api/product (In-Memory)');
      console.log('  • TMF679 - Product Qualification: /productOfferingQualification/v5 (In-Memory)');
      console.log('  • TMF688 - Event Management: /tmf-api/event/v4 (In-Memory)');
      console.log(`  • TMF760 - Product Configuration: /tmf-api/productConfigurationManagement/v5 ${database.isConnected() ? '(MongoDB)' : '(Disabled)'}`);
      console.log('');
      console.log('🔗 Endpoints:');
      console.log(`  • Health Check: http://localhost:${PORT}/health`);
      console.log(`  • API Info: http://localhost:${PORT}/`);
      console.log(`  • Debug Storage: http://localhost:${PORT}/debug/storage`);
      console.log('='.repeat(60));
      console.log('✅ All TMF APIs unified and ready!');
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch(console.error);

module.exports = app;