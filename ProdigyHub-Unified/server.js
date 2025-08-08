require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const database = require('./src/config/database');
const app = express();

// Collection fix utility function
async function fixCappedCollection() {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const collection = db.collection('productofferings');
    
    // Check if collection exists and is capped
    const isCapped = await collection.isCapped();
    console.log('📋 Product Offerings collection capped status:', isCapped);
    
    if (isCapped) {
      console.log('🔧 Converting capped collection to regular collection...');
      
      // Export all data
      const data = await collection.find({}).toArray();
      console.log(`📦 Found ${data.length} documents to preserve`);
      
      // Drop the capped collection
      await collection.drop();
      console.log('🗑️ Dropped capped collection');
      
      // Recreate as regular collection
      const newCollection = db.collection('productofferings');
      
      // Re-insert all data if any exists
      if (data.length > 0) {
        await newCollection.insertMany(data);
        console.log(`✅ Re-inserted ${data.length} documents`);
      }
      
      console.log('✅ Successfully converted to regular collection!');
      
      // Verify the fix
      const newStats = await newCollection.stats();
      console.log('📊 New collection stats:', {
        count: newStats.count,
        capped: newStats.capped || false
      });
    } else {
      console.log('✅ Product Offerings collection is already regular (not capped)');
    }
    
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('📋 Product Offerings collection does not exist yet - will be created normally');
    } else {
      console.error('❌ Error checking/fixing collection:', error.message);
    }
  }
}


const PORT = process.env.PORT || 3000;


const { getCorsConfig, tmfCorsMiddleware, corsErrorHandler } = require('./src/config/cors');
// CORS Configuration - CRITICAL: Add this BEFORE your routes
const corsConfig = getCorsConfig();
app.use(cors(corsConfig));

// Add enhanced TMF CORS middleware
app.use(tmfCorsMiddleware);

// Additional CORS middleware for stubborn browsers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow specific origins for development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  // Always set these headers
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
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
  max: 1000,
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
// HELPER FUNCTIONS
// ===================================

const applyFieldSelection = (obj, fields) => {
  if (!fields || typeof fields !== 'string') {
    return obj;
  }
  
  const fieldsArray = fields.split(',').map(field => field.trim());
  const result = {};
  
  // Always include mandatory fields
  const mandatoryFields = ['@type', 'id', 'href'];
  const allFields = [...new Set([...fieldsArray, ...mandatoryFields])];
  
  allFields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
  });
  
  return result;
};

const handleError = (res, error, operation = 'operation') => {
  console.error(`❌ Error during ${operation}:`, error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid data provided',
      details: Object.values(error.errors).map(e => e.message)
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
};

// ===================================
// TMF620 CONTROLLER IMPLEMENTATION
// ===================================

class TMF620Controller {
  async getCategories(req, res) {
    try {
      const { Category } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = Category.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const categories = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(categories);
    } catch (error) {
      handleError(res, error, 'get categories');
    }
  }

  async getCategoryById(req, res) {
    try {
      const { Category } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = Category.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const category = await query;
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json(category);
    } catch (error) {
      handleError(res, error, 'get category by ID');
    }
  }

  async createCategory(req, res) {
    try {
      const { Category } = require('./src/models/AllTMFModels');
      const categoryData = {
        ...req.body,
        '@type': 'Category'
      };
      
      const category = new Category(categoryData);
      await category.save();
      
      res.status(201).json(category);
    } catch (error) {
      handleError(res, error, 'create category');
    }
  }

  async updateCategory(req, res) {
    try {
      const { Category } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const updates = { ...req.body, lastUpdate: new Date() };
      
      const category = await Category.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json(category);
    } catch (error) {
      handleError(res, error, 'update category');
    }
  }

  async deleteCategory(req, res) {
    try {
      const { Category } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      
      const category = await Category.findOneAndDelete({ id });
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'delete category');
    }
  }

  async getProductSpecifications(req, res) {
    try {
      const { ProductSpecification } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = ProductSpecification.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const specs = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(specs);
    } catch (error) {
      handleError(res, error, 'get product specifications');
    }
  }

  async getProductSpecificationById(req, res) {
    try {
      const { ProductSpecification } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = ProductSpecification.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const spec = await query;
      
      if (!spec) {
        return res.status(404).json({ error: 'ProductSpecification not found' });
      }
      
      res.json(spec);
    } catch (error) {
      handleError(res, error, 'get product specification by ID');
    }
  }

  async createProductSpecification(req, res) {
    try {
      const { ProductSpecification } = require('./src/models/AllTMFModels');
      const specData = {
        ...req.body,
        '@type': 'ProductSpecification'
      };
      
      const spec = new ProductSpecification(specData);
      await spec.save();
      
      res.status(201).json(spec);
    } catch (error) {
      handleError(res, error, 'create product specification');
    }
  }

  async getProductOfferings(req, res) {
    try {
      const { ProductOffering } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = ProductOffering.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const offerings = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(offerings);
    } catch (error) {
      handleError(res, error, 'get product offerings');
    }
  }

  async getProductOfferingById(req, res) {
    try {
      const { ProductOffering } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = ProductOffering.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const offering = await query;
      
      if (!offering) {
        return res.status(404).json({ error: 'ProductOffering not found' });
      }
      
      res.json(offering);
    } catch (error) {
      handleError(res, error, 'get product offering by ID');
    }
  }

// Update your createProductOffering method in server.js
async createProductOffering(req, res) {
  try {
    console.log('📥 Backend received ALL data:', JSON.stringify(req.body, null, 2));
    
    const { ProductOffering } = require('./src/models/AllTMFModels');
    
    // Create offering with ALL incoming data preserved
    const offeringData = {
      ...req.body,  // This spreads ALL fields from the request
      '@type': 'ProductOffering',
      lastUpdate: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📦 Saving ALL data to MongoDB:', JSON.stringify(offeringData, null, 2));
    
    // Use mongoose's create method with strict: false override
    const offering = await ProductOffering.create(offeringData);
    
    console.log('✅ MongoDB saved with ALL fields:', JSON.stringify(offering.toObject(), null, 2));
    
    res.status(201).json(offering);
  } catch (error) {
    console.error('❌ Error saving to MongoDB:', error);
    handleError(res, error, 'create product offering');
  }
}
// Add these methods to TMF620Controller class:

async updateProductSpecification(req, res) {
  try {
    const { ProductSpecification } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    const updates = { ...req.body, lastUpdate: new Date() };
    
    const spec = await ProductSpecification.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!spec) {
      return res.status(404).json({ error: 'ProductSpecification not found' });
    }
    
    res.json(spec);
  } catch (error) {
    handleError(res, error, 'update product specification');
  }
}

async deleteProductSpecification(req, res) {
  try {
    const { ProductSpecification } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const spec = await ProductSpecification.findOneAndDelete({ id });
    
    if (!spec) {
      return res.status(404).json({ error: 'ProductSpecification not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'delete product specification');
  }
}

async updateProductOffering(req, res) {
  try {
    console.log('📝 Backend updating with ALL data:', JSON.stringify(req.body, null, 2));
    
    const { ProductOffering } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const updates = { 
      ...req.body,
      lastUpdate: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📦 Updating MongoDB with ALL fields:', JSON.stringify(updates, null, 2));
    
    const offering = await ProductOffering.findOneAndUpdate(
      { id },
      { $set: updates },
      { 
        new: true, 
        runValidators: true,
        strict: false
      }
    );
    
    if (!offering) {
      return res.status(404).json({ error: 'ProductOffering not found' });
    }
    
    console.log('✅ MongoDB updated with ALL fields:', JSON.stringify(offering.toObject(), null, 2));
    
    res.json(offering);
  } catch (error) {
    console.error('❌ Error updating MongoDB:', error);
    handleError(res, error, 'update product offering');
  }
}

async deleteProductOffering(req, res) {
  try {
    const { ProductOffering } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const offering = await ProductOffering.findOneAndDelete({ id });
    
    if (!offering) {
      return res.status(404).json({ error: 'ProductOffering not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'delete product offering');
  }
}
// Add these methods to your TMF620Controller class (after line ~185 where createProductOffering ends)

async getProductOfferingPrices(req, res) {
  try {
    const { ProductOfferingPrice } = require('./src/models/AllTMFModels');
    const { fields, limit = 20, offset = 0, ...filters } = req.query;
    
    let query = ProductOfferingPrice.find(filters);
    
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim()).join(' ');
      query = query.select(`${fieldList} @type id href`);
    }
    
    const prices = await query
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });
    
    res.json(prices);
  } catch (error) {
    handleError(res, error, 'get product offering prices');
  }
}

async getProductOfferingPriceById(req, res) {
  try {
    const { ProductOfferingPrice } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    const { fields } = req.query;
    
    let query = ProductOfferingPrice.findOne({ id });
    
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim()).join(' ');
      query = query.select(`${fieldList} @type id href`);
    }
    
    const price = await query;
    
    if (!price) {
      return res.status(404).json({ error: 'ProductOfferingPrice not found' });
    }
    
    res.json(price);
  } catch (error) {
    handleError(res, error, 'get product offering price by ID');
  }
}

async createProductOfferingPrice(req, res) {
  try {
    const { ProductOfferingPrice } = require('./src/models/AllTMFModels');
    const priceData = {
      ...req.body,
      '@type': 'ProductOfferingPrice'
    };
    
    const price = new ProductOfferingPrice(priceData);
    await price.save();
    
    res.status(201).json(price);
  } catch (error) {
    handleError(res, error, 'create product offering price');
  }
}

async updateProductOfferingPrice(req, res) {
  try {
    const { ProductOfferingPrice } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    const updates = { ...req.body, lastUpdate: new Date() };
    
    const price = await ProductOfferingPrice.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!price) {
      return res.status(404).json({ error: 'ProductOfferingPrice not found' });
    }
    
    res.json(price);
  } catch (error) {
    handleError(res, error, 'update product offering price');
  }
}

async deleteProductOfferingPrice(req, res) {
  try {
    const { ProductOfferingPrice } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const price = await ProductOfferingPrice.findOneAndDelete({ id });
    
    if (!price) {
      return res.status(404).json({ error: 'ProductOfferingPrice not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'delete product offering price');
  }
}

async getProductCatalogs(req, res) {
  try {
    const { ProductCatalog } = require('./src/models/AllTMFModels');
    const { fields, limit = 20, offset = 0, ...filters } = req.query;
    
    let query = ProductCatalog.find(filters);
    
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim()).join(' ');
      query = query.select(`${fieldList} @type id href`);
    }
    
    const catalogs = await query
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });
    
    res.json(catalogs);
  } catch (error) {
    handleError(res, error, 'get product catalogs');
  }
}

async getProductCatalogById(req, res) {
  try {
    const { ProductCatalog } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    const { fields } = req.query;
    
    let query = ProductCatalog.findOne({ id });
    
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim()).join(' ');
      query = query.select(`${fieldList} @type id href`);
    }
    
    const catalog = await query;
    
    if (!catalog) {
      return res.status(404).json({ error: 'ProductCatalog not found' });
    }
    
    res.json(catalog);
  } catch (error) {
    handleError(res, error, 'get product catalog by ID');
  }
}

async createProductCatalog(req, res) {
  try {
    const { ProductCatalog } = require('./src/models/AllTMFModels');
    const catalogData = {
      ...req.body,
      '@type': 'ProductCatalog'
    };
    
    const catalog = new ProductCatalog(catalogData);
    await catalog.save();
    
    res.status(201).json(catalog);
  } catch (error) {
    handleError(res, error, 'create product catalog');
  }
}

async updateProductCatalog(req, res) {
  try {
    const { ProductCatalog } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    const updates = { ...req.body, lastUpdate: new Date() };
    
    const catalog = await ProductCatalog.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!catalog) {
      return res.status(404).json({ error: 'ProductCatalog not found' });
    }
    
    res.json(catalog);
  } catch (error) {
    handleError(res, error, 'update product catalog');
  }
}

async deleteProductCatalog(req, res) {
  try {
    const { ProductCatalog } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const catalog = await ProductCatalog.findOneAndDelete({ id });
    
    if (!catalog) {
      return res.status(404).json({ error: 'ProductCatalog not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'delete product catalog');
  }
}
}

// ===================================
// TMF637 CONTROLLER IMPLEMENTATION
// ===================================

class TMF637Controller {
  generateId(prefix) {
    return `${prefix}-${uuidv4()}`;
  }

  ensureString(value, defaultValue = '') {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }

  async getAllProducts(req, res) {
    try {
      const { Product } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = Product.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const products = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(products);
    } catch (error) {
      handleError(res, error, 'get all products');
    }
  }

  async getProductById(req, res) {
    try {
      const { Product } = require('./src/models/AllTMFModels');
      const productId = req.params.id;
      const { fields } = req.query;
      
      let query = Product.findOne({ id: productId });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const product = await query;
      
      if (!product) {
        return res.status(404).json({ 
          error: 'Product not found',
          message: `Product with id ${productId} does not exist`
        });
      }

      res.status(200).json(product);
    } catch (error) {
      handleError(res, error, 'get product by ID');
    }
  }

  async createProduct(req, res) {
    try {
      const { Product } = require('./src/models/AllTMFModels');
      const data = req.body;
      const timestamp = new Date().toISOString();

      const newProduct = {
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

      if (data.productSpecification) {
        newProduct.productSpecification = {
          id: this.ensureString(data.productSpecification.id, 'default-spec-id'),
          href: this.ensureString(data.productSpecification.href, `http://localhost:3000/productSpecification/${data.productSpecification.id || 'default-spec-id'}`),
          name: this.ensureString(data.productSpecification.name, 'Default Specification'),
          version: this.ensureString(data.productSpecification.version, '1.0'),
          ...data.productSpecification
        };
      }

      if (data.billingAccount) {
        newProduct.billingAccount = {
          id: this.ensureString(data.billingAccount.id, 'default-billing-id'),
          href: this.ensureString(data.billingAccount.href, `http://localhost:3000/billingAccount/${data.billingAccount.id || 'default-billing-id'}`),
          name: this.ensureString(data.billingAccount.name, 'Default Billing Account'),
          ...data.billingAccount
        };
      }

      if (data.productOffering) {
        newProduct.productOffering = {
          id: this.ensureString(data.productOffering.id, 'default-offering-id'),
          href: this.ensureString(data.productOffering.href, `http://localhost:3000/productOffering/${data.productOffering.id || 'default-offering-id'}`),
          name: this.ensureString(data.productOffering.name, 'Default Product Offering'),
          ...data.productOffering
        };
      }

      const product = new Product(newProduct);
      await product.save();
      
      res.status(201).json(product);
    } catch (error) {
      handleError(res, error, 'create product');
    }
  }

  async updateProduct(req, res) {
    try {
      const { Product } = require('./src/models/AllTMFModels');
      const productId = req.params.id;
      
      const updatedProduct = {
        ...req.body,
        lastUpdate: new Date().toISOString()
      };

      updatedProduct.name = this.ensureString(updatedProduct.name, 'Updated Product Name');
      updatedProduct.description = this.ensureString(updatedProduct.description, 'Updated description');
      updatedProduct.status = this.ensureString(updatedProduct.status, 'active');
      updatedProduct.productSerialNumber = this.ensureString(updatedProduct.productSerialNumber, '');
      updatedProduct.terminationDate = this.ensureString(updatedProduct.terminationDate, '');

      const product = await Product.findOneAndUpdate(
        { id: productId },
        { $set: updatedProduct },
        { new: true, runValidators: true }
      );
      
      if (!product) {
        return res.status(404).json({ 
          error: 'Product not found',
          message: `Product with id ${productId} does not exist`
        });
      }

      res.status(200).json(product);
    } catch (error) {
      handleError(res, error, 'update product');
    }
  }

  async deleteProduct(req, res) {
    try {
      const { Product } = require('./src/models/AllTMFModels');
      const productId = req.params.id;
      
      const product = await Product.findOneAndDelete({ id: productId });
      
      if (!product) {
        return res.status(404).json({ 
          error: 'Product not found',
          message: `Product with id ${productId} does not exist`
        });
      }

      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'delete product');
    }
  }
}

// Create controller instances
const tmf620Controller = new TMF620Controller();
const tmf637Controller = new TMF637Controller();
// ===================================
// REMAINING CONTROLLERS (TMF679, TMF622, TMF688)
// ===================================

// TMF679 Controller (Product Offering Qualification)
class TMF679Controller {
  async getCheckQualifications(req, res) {
    try {
      const { CheckProductOfferingQualification } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = CheckProductOfferingQualification.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const qualifications = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(qualifications);
    } catch (error) {
      handleError(res, error, 'get check qualifications');
    }
  }

  async getCheckQualificationById(req, res) {
    try {
      const { CheckProductOfferingQualification } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = CheckProductOfferingQualification.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const qualification = await query;
      
      if (!qualification) {
        return res.status(404).json({ error: 'CheckProductOfferingQualification not found' });
      }
      
      res.json(qualification);
    } catch (error) {
      handleError(res, error, 'get check qualification by ID');
    }
  }

  async createCheckQualification(req, res) {
    try {
      const { CheckProductOfferingQualification } = require('./src/models/AllTMFModels');
      const qualificationData = {
        ...req.body,
        '@type': 'CheckProductOfferingQualification'
      };
      
      const qualification = new CheckProductOfferingQualification(qualificationData);
      await qualification.save();
      
      res.status(201).json(qualification);
    } catch (error) {
      handleError(res, error, 'create check qualification');
    }
  }

  async getQueryQualifications(req, res) {
    try {
      const { QueryProductOfferingQualification } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = QueryProductOfferingQualification.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const qualifications = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(qualifications);
    } catch (error) {
      handleError(res, error, 'get query qualifications');
    }
  }

  async getQueryQualificationById(req, res) {
    try {
      const { QueryProductOfferingQualification } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = QueryProductOfferingQualification.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const qualification = await query;
      
      if (!qualification) {
        return res.status(404).json({ error: 'QueryProductOfferingQualification not found' });
      }
      
      res.json(qualification);
    } catch (error) {
      handleError(res, error, 'get query qualification by ID');
    }
  }

  async createQueryQualification(req, res) {
    try {
      const { QueryProductOfferingQualification } = require('./src/models/AllTMFModels');
      const qualificationData = {
        ...req.body,
        '@type': 'QueryProductOfferingQualification'
      };
      
      const qualification = new QueryProductOfferingQualification(qualificationData);
      await qualification.save();
      
      res.status(201).json(qualification);
    } catch (error) {
      handleError(res, error, 'create query qualification');
    }
  }
  // Add these methods to TMF679Controller class:

async deleteCheckQualification(req, res) {
  try {
    const { CheckProductOfferingQualification } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const qualification = await CheckProductOfferingQualification.findOneAndDelete({ id });
    
    if (!qualification) {
      return res.status(404).json({ error: 'CheckProductOfferingQualification not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'delete check qualification');
  }
}

async deleteQueryQualification(req, res) {
  try {
    const { QueryProductOfferingQualification } = require('./src/models/AllTMFModels');
    const { id } = req.params;
    
    const qualification = await QueryProductOfferingQualification.findOneAndDelete({ id });
    
    if (!qualification) {
      return res.status(404).json({ error: 'QueryProductOfferingQualification not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'delete query qualification');
  }
}
}

// TMF622 Controller (Product Ordering)
class TMF622Controller {
  async createProductOrder(req, res) {
    try {
      const { ProductOrder } = require('./src/models/AllTMFModels');
      const orderData = {
        ...req.body,
        '@type': 'ProductOrder'
      };
      
      const order = new ProductOrder(orderData);
      await order.save();
      
      res.status(201).json(order);
    } catch (error) {
      handleError(res, error, 'create product order');
    }
  }

  async getProductOrders(req, res) {
    try {
      const { ProductOrder } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = ProductOrder.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const orders = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(orders);
    } catch (error) {
      handleError(res, error, 'get product orders');
    }
  }

  async getProductOrderById(req, res) {
    try {
      const { ProductOrder } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = ProductOrder.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const order = await query;
      
      if (!order) {
        return res.status(404).json({ error: 'ProductOrder not found' });
      }
      
      res.json(order);
    } catch (error) {
      handleError(res, error, 'get product order by ID');
    }
  }

  async updateProductOrder(req, res) {
    try {
      const { ProductOrder } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const updates = { ...req.body, lastUpdate: new Date() };
      
      const order = await ProductOrder.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      if (!order) {
        return res.status(404).json({ error: 'ProductOrder not found' });
      }
      
      res.json(order);
    } catch (error) {
      handleError(res, error, 'update product order');
    }
  }

  async deleteProductOrder(req, res) {
    try {
      const { ProductOrder } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      
      const order = await ProductOrder.findOneAndDelete({ id });
      
      if (!order) {
        return res.status(404).json({ error: 'ProductOrder not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'delete product order');
    }
  }

  async createCancelProductOrder(req, res) {
    try {
      const { CancelProductOrder } = require('./src/models/AllTMFModels');
      const cancelData = {
        ...req.body,
        '@type': 'CancelProductOrder'
      };
      
      const cancelOrder = new CancelProductOrder(cancelData);
      await cancelOrder.save();
      
      res.status(201).json(cancelOrder);
    } catch (error) {
      handleError(res, error, 'create cancel product order');
    }
  }

  async getCancelProductOrders(req, res) {
    try {
      const { CancelProductOrder } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = CancelProductOrder.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const cancelOrders = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(cancelOrders);
    } catch (error) {
      handleError(res, error, 'get cancel product orders');
    }
  }

  async getCancelProductOrderById(req, res) {
    try {
      const { CancelProductOrder } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = CancelProductOrder.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const cancelOrder = await query;
      
      if (!cancelOrder) {
        return res.status(404).json({ error: 'CancelProductOrder not found' });
      }
      
      res.json(cancelOrder);
    } catch (error) {
      handleError(res, error, 'get cancel product order by ID');
    }
  }
}

// TMF688 Controller (Event Management)
class TMF688Controller {
  async getAllEvents(req, res) {
    try {
      const { Event } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = Event.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const events = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(events);
    } catch (error) {
      handleError(res, error, 'get all events');
    }
  }

  async getEventById(req, res) {
    try {
      const { Event } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = Event.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const event = await query;
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      res.json(event);
    } catch (error) {
      handleError(res, error, 'get event by ID');
    }
  }

  async createEvent(req, res) {
    try {
      const { Event } = require('./src/models/AllTMFModels');
      const eventData = {
        ...req.body,
        '@type': 'Event'
      };
      
      const event = new Event(eventData);
      await event.save();
      
      res.status(201).json(event);
    } catch (error) {
      handleError(res, error, 'create event');
    }
  }

  async updateEvent(req, res) {
    try {
      const { Event } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const updates = req.body;
      
      const event = await Event.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      res.json(event);
    } catch (error) {
      handleError(res, error, 'update event');
    }
  }

  async deleteEvent(req, res) {
    try {
      const { Event } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      
      const event = await Event.findOneAndDelete({ id });
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'delete event');
    }
  }

  async getAllHubs(req, res) {
    try {
      const { Hub } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = Hub.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const hubs = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(hubs);
    } catch (error) {
      handleError(res, error, 'get all hubs');
    }
  }

  async getHubById(req, res) {
    try {
      const { Hub } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = Hub.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const hub = await query;
      
      if (!hub) {
        return res.status(404).json({ error: 'Hub not found' });
      }
      
      res.json(hub);
    } catch (error) {
      handleError(res, error, 'get hub by ID');
    }
  }

  async createHub(req, res) {
    try {
      const { Hub } = require('./src/models/AllTMFModels');
      const hubData = {
        ...req.body,
        '@type': 'Hub'
      };
      
      if (!hubData.callback) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'callback is required'
        });
      }
      
      const hub = new Hub(hubData);
      await hub.save();
      
      res.status(201).json(hub);
    } catch (error) {
      handleError(res, error, 'create hub');
    }
  }

  async deleteHub(req, res) {
    try {
      const { Hub } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      
      const hub = await Hub.findOneAndDelete({ id });
      
      if (!hub) {
        return res.status(404).json({ error: 'Hub not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'delete hub');
    }
  }

  async getAllTopics(req, res) {
    try {
      const { Topic } = require('./src/models/AllTMFModels');
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = Topic.find(filters);
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const topics = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      res.json(topics);
    } catch (error) {
      handleError(res, error, 'get all topics');
    }
  }

  async getTopicById(req, res) {
    try {
      const { Topic } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = Topic.findOne({ id });
      
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href`);
      }
      
      const topic = await query;
      
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      
      res.json(topic);
    } catch (error) {
      handleError(res, error, 'get topic by ID');
    }
  }

  async createTopic(req, res) {
    try {
      const { Topic } = require('./src/models/AllTMFModels');
      const topicData = {
        ...req.body,
        '@type': 'Topic'
      };
      
      if (!topicData.name) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'name is required'
        });
      }
      
      const topic = new Topic(topicData);
      await topic.save();
      
      res.status(201).json(topic);
    } catch (error) {
      handleError(res, error, 'create topic');
    }
  }

  async deleteTopic(req, res) {
    try {
      const { Topic } = require('./src/models/AllTMFModels');
      const { id } = req.params;
      
      const topic = await Topic.findOneAndDelete({ id });
      
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'delete topic');
    }
  }
}

// Create controller instances
const tmf679Controller = new TMF679Controller();
const tmf622Controller = new TMF622Controller();
const tmf688Controller = new TMF688Controller();

// ===================================
// MAIN ROUTES & HEALTH CHECK
// ===================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ProdigyHub - Unified TMF API Backend (MongoDB)',
    version: '1.0.0',
    description: 'Complete TM Forum API Suite Implementation with MongoDB',
    apis: {
      'TMF620': 'Product Catalog Management',
      'TMF637': 'Product Inventory Management', 
      'TMF679': 'Product Offering Qualification',
      'TMF622': 'Product Ordering Management',
      'TMF688': 'Event Management',
      'TMF760': 'Product Configuration Management'
    },
    endpoints: {
      productCatalog: '/productCatalogManagement/v5/*',
      productInventory: '/tmf-api/product*',
      productQualification: '/productOfferingQualification/v5/*',
      productOrdering: '/productOrderingManagement/v4/*',
      eventManagement: '/tmf-api/event/v4/*',
      productConfiguration: '/tmf-api/productConfigurationManagement/v5/*'
    },
    storage: 'MongoDB',
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
        'TMF620': database.isConnected() ? 'Active (MongoDB)' : 'Inactive (Database Disconnected)',
        'TMF637': database.isConnected() ? 'Active (MongoDB)' : 'Inactive (Database Disconnected)',
        'TMF679': database.isConnected() ? 'Active (MongoDB)' : 'Inactive (Database Disconnected)',
        'TMF622': database.isConnected() ? 'Active (MongoDB)' : 'Inactive (Database Disconnected)',
        'TMF688': database.isConnected() ? 'Active (MongoDB)' : 'Inactive (Database Disconnected)',
        'TMF760': database.isConnected() ? 'Active (MongoDB)' : 'Inactive (Database Disconnected)'
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

// Fixed debug endpoint for storage verification
app.get('/debug/storage', async (req, res) => {
  try {
    if (!database.isConnected()) {
      return res.json({
        storage: 'MongoDB Disconnected',
        connected: false,
        message: 'Database connection not available'
      });
    }

    // Import models dynamically to avoid loading issues
    const models = require('./src/models/AllTMFModels');
    
    const counts = {};
    
    try {
      counts.categories = await models.Category.countDocuments();
      counts.productspecifications = await models.ProductSpecification.countDocuments();
      counts.productofferings = await models.ProductOffering.countDocuments();
      counts.productofferingprices = await models.ProductOfferingPrice.countDocuments();
      counts.productcatalogs = await models.ProductCatalog.countDocuments();
      counts.products = await models.Product.countDocuments();
      counts.checkproductofferingqualifications = await models.CheckProductOfferingQualification.countDocuments();
      counts.queryproductofferingqualifications = await models.QueryProductOfferingQualification.countDocuments();
      counts.productorders = await models.ProductOrder.countDocuments();
      counts.cancelproductorders = await models.CancelProductOrder.countDocuments();
      counts.events = await models.Event.countDocuments();
      counts.hubs = await models.Hub.countDocuments();
      counts.topics = await models.Topic.countDocuments();
      
      // TMF760 models from separate implementation
      try {
        const CheckProductConfiguration = require('./models/CheckProductConfiguration');
        const QueryProductConfiguration = require('./models/QueryProductConfiguration');
        counts.checkproductconfigurations = await CheckProductConfiguration.countDocuments();
        counts.queryproductconfigurations = await QueryProductConfiguration.countDocuments();
      } catch (tmf760Error) {
        console.log('TMF760 models not available:', tmf760Error.message);
        counts.checkproductconfigurations = 0;
        counts.queryproductconfigurations = 0;
      }
      
    } catch (countError) {
      console.error('Error counting documents:', countError);
      return res.status(500).json({
        storage: 'Error',
        error: countError.message,
        connected: database.isConnected()
      });
    }
    
    res.json({
      storage: 'MongoDB',
      connected: database.isConnected(),
      database: database.getStats(),
      collections: counts,
      environment: process.env.NODE_ENV,
      message: 'All TMF APIs using MongoDB persistence'
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
// TMF API ROUTES - COMPLETE & UPDATED
// ===================================

// TMF620 - Product Catalog Management
// Categories
app.get('/productCatalogManagement/v5/category', (req, res) => tmf620Controller.getCategories(req, res));
app.post('/productCatalogManagement/v5/category', (req, res) => tmf620Controller.createCategory(req, res));
app.get('/productCatalogManagement/v5/category/:id', (req, res) => tmf620Controller.getCategoryById(req, res));
app.patch('/productCatalogManagement/v5/category/:id', (req, res) => tmf620Controller.updateCategory(req, res));
app.delete('/productCatalogManagement/v5/category/:id', (req, res) => tmf620Controller.deleteCategory(req, res));

// Product Specifications
app.get('/productCatalogManagement/v5/productSpecification', (req, res) => tmf620Controller.getProductSpecifications(req, res));
app.post('/productCatalogManagement/v5/productSpecification', (req, res) => tmf620Controller.createProductSpecification(req, res));
app.get('/productCatalogManagement/v5/productSpecification/:id', (req, res) => tmf620Controller.getProductSpecificationById(req, res));
app.patch('/productCatalogManagement/v5/productSpecification/:id', (req, res) => tmf620Controller.updateProductSpecification(req, res));
app.delete('/productCatalogManagement/v5/productSpecification/:id', (req, res) => tmf620Controller.deleteProductSpecification(req, res));

// Product Offerings
app.get('/productCatalogManagement/v5/productOffering', (req, res) => tmf620Controller.getProductOfferings(req, res));
app.post('/productCatalogManagement/v5/productOffering', (req, res) => tmf620Controller.createProductOffering(req, res));
app.get('/productCatalogManagement/v5/productOffering/:id', (req, res) => tmf620Controller.getProductOfferingById(req, res));
app.patch('/productCatalogManagement/v5/productOffering/:id', (req, res) => tmf620Controller.updateProductOffering(req, res));
app.delete('/productCatalogManagement/v5/productOffering/:id', (req, res) => tmf620Controller.deleteProductOffering(req, res));

// Product Offering Prices
app.get('/productCatalogManagement/v5/productOfferingPrice', (req, res) => tmf620Controller.getProductOfferingPrices(req, res));
app.post('/productCatalogManagement/v5/productOfferingPrice', (req, res) => tmf620Controller.createProductOfferingPrice(req, res));
app.get('/productCatalogManagement/v5/productOfferingPrice/:id', (req, res) => tmf620Controller.getProductOfferingPriceById(req, res));
app.patch('/productCatalogManagement/v5/productOfferingPrice/:id', (req, res) => tmf620Controller.updateProductOfferingPrice(req, res));
app.delete('/productCatalogManagement/v5/productOfferingPrice/:id', (req, res) => tmf620Controller.deleteProductOfferingPrice(req, res));

// Product Catalogs
app.get('/productCatalogManagement/v5/productCatalog', (req, res) => tmf620Controller.getProductCatalogs(req, res));
app.post('/productCatalogManagement/v5/productCatalog', (req, res) => tmf620Controller.createProductCatalog(req, res));
app.get('/productCatalogManagement/v5/productCatalog/:id', (req, res) => tmf620Controller.getProductCatalogById(req, res));
app.patch('/productCatalogManagement/v5/productCatalog/:id', (req, res) => tmf620Controller.updateProductCatalog(req, res));
app.delete('/productCatalogManagement/v5/productCatalog/:id', (req, res) => tmf620Controller.deleteProductCatalog(req, res));

// Import/Export Jobs (if needed)
app.get('/productCatalogManagement/v5/importJob', (req, res) => tmf620Controller.getImportJobs ? tmf620Controller.getImportJobs(req, res) : res.status(501).json({error: 'Not implemented'}));
app.post('/productCatalogManagement/v5/importJob', (req, res) => tmf620Controller.createImportJob ? tmf620Controller.createImportJob(req, res) : res.status(501).json({error: 'Not implemented'}));
app.get('/productCatalogManagement/v5/importJob/:id', (req, res) => tmf620Controller.getImportJobById ? tmf620Controller.getImportJobById(req, res) : res.status(501).json({error: 'Not implemented'}));
app.delete('/productCatalogManagement/v5/importJob/:id', (req, res) => tmf620Controller.deleteImportJob ? tmf620Controller.deleteImportJob(req, res) : res.status(501).json({error: 'Not implemented'}));

app.get('/productCatalogManagement/v5/exportJob', (req, res) => tmf620Controller.getExportJobs ? tmf620Controller.getExportJobs(req, res) : res.status(501).json({error: 'Not implemented'}));
app.post('/productCatalogManagement/v5/exportJob', (req, res) => tmf620Controller.createExportJob ? tmf620Controller.createExportJob(req, res) : res.status(501).json({error: 'Not implemented'}));
app.get('/productCatalogManagement/v5/exportJob/:id', (req, res) => tmf620Controller.getExportJobById ? tmf620Controller.getExportJobById(req, res) : res.status(501).json({error: 'Not implemented'}));
app.delete('/productCatalogManagement/v5/exportJob/:id', (req, res) => tmf620Controller.deleteExportJob ? tmf620Controller.deleteExportJob(req, res) : res.status(501).json({error: 'Not implemented'}));

// TMF620 Hub Management
app.post('/productCatalogManagement/v5/hub', (req, res) => tmf620Controller.createHub ? tmf620Controller.createHub(req, res) : res.status(501).json({error: 'Not implemented'}));
app.delete('/productCatalogManagement/v5/hub/:id', (req, res) => tmf620Controller.deleteHub ? tmf620Controller.deleteHub(req, res) : res.status(501).json({error: 'Not implemented'}));

// TMF637 - Product Inventory Management
app.get('/tmf-api/product', (req, res) => tmf637Controller.getAllProducts(req, res));
app.post('/tmf-api/product', (req, res) => tmf637Controller.createProduct(req, res));
app.get('/tmf-api/product/:id', (req, res) => tmf637Controller.getProductById(req, res));
app.patch('/tmf-api/product/:id', (req, res) => tmf637Controller.updateProduct(req, res));
app.delete('/tmf-api/product/:id', (req, res) => tmf637Controller.deleteProduct(req, res));

// TMF637 Hub Management
app.post('/tmf-api/hub', (req, res) => tmf637Controller.createHub ? tmf637Controller.createHub(req, res) : res.status(501).json({error: 'Not implemented'}));
app.delete('/tmf-api/hub/:id', (req, res) => tmf637Controller.deleteHub ? tmf637Controller.deleteHub(req, res) : res.status(501).json({error: 'Not implemented'}));

// TMF679 - Product Offering Qualification
// Check Product Offering Qualification
app.get('/productOfferingQualification/v5/checkProductOfferingQualification', (req, res) => tmf679Controller.getCheckQualifications(req, res));
app.post('/productOfferingQualification/v5/checkProductOfferingQualification', (req, res) => tmf679Controller.createCheckQualification(req, res));
app.get('/productOfferingQualification/v5/checkProductOfferingQualification/:id', (req, res) => tmf679Controller.getCheckQualificationById(req, res));
app.patch('/productOfferingQualification/v5/checkProductOfferingQualification/:id', (req, res) => tmf679Controller.updateCheckQualification ? tmf679Controller.updateCheckQualification(req, res) : res.status(501).json({error: 'Not implemented'}));
app.delete('/productOfferingQualification/v5/checkProductOfferingQualification/:id', (req, res) => tmf679Controller.deleteCheckQualification(req, res));

// Query Product Offering Qualification
app.get('/productOfferingQualification/v5/queryProductOfferingQualification', (req, res) => tmf679Controller.getQueryQualifications(req, res));
app.post('/productOfferingQualification/v5/queryProductOfferingQualification', (req, res) => tmf679Controller.createQueryQualification(req, res));
app.get('/productOfferingQualification/v5/queryProductOfferingQualification/:id', (req, res) => tmf679Controller.getQueryQualificationById(req, res));
app.patch('/productOfferingQualification/v5/queryProductOfferingQualification/:id', (req, res) => tmf679Controller.updateQueryQualification ? tmf679Controller.updateQueryQualification(req, res) : res.status(501).json({error: 'Not implemented'}));
app.delete('/productOfferingQualification/v5/queryProductOfferingQualification/:id', (req, res) => tmf679Controller.deleteQueryQualification(req, res));

// TMF622 - Product Ordering Management
// Product Orders
app.get('/productOrderingManagement/v4/productOrder', (req, res) => tmf622Controller.getProductOrders(req, res));
app.post('/productOrderingManagement/v4/productOrder', (req, res) => tmf622Controller.createProductOrder(req, res));
app.get('/productOrderingManagement/v4/productOrder/:id', (req, res) => tmf622Controller.getProductOrderById(req, res));
app.patch('/productOrderingManagement/v4/productOrder/:id', (req, res) => tmf622Controller.updateProductOrder(req, res));
app.delete('/productOrderingManagement/v4/productOrder/:id', (req, res) => tmf622Controller.deleteProductOrder(req, res));

// Cancel Product Orders
app.get('/productOrderingManagement/v4/cancelProductOrder', (req, res) => tmf622Controller.getCancelProductOrders(req, res));
app.post('/productOrderingManagement/v4/cancelProductOrder', (req, res) => tmf622Controller.createCancelProductOrder(req, res));
app.get('/productOrderingManagement/v4/cancelProductOrder/:id', (req, res) => tmf622Controller.getCancelProductOrderById(req, res));

// TMF688 - Event Management
// Events
app.get('/tmf-api/event/v4/event', (req, res) => tmf688Controller.getAllEvents(req, res));
app.post('/tmf-api/event/v4/event', (req, res) => tmf688Controller.createEvent(req, res));
app.get('/tmf-api/event/v4/event/:id', (req, res) => tmf688Controller.getEventById(req, res));
app.patch('/tmf-api/event/v4/event/:id', (req, res) => tmf688Controller.updateEvent(req, res));
app.delete('/tmf-api/event/v4/event/:id', (req, res) => tmf688Controller.deleteEvent(req, res));

// Topics
app.get('/tmf-api/event/v4/topic', (req, res) => tmf688Controller.getAllTopics(req, res));
app.post('/tmf-api/event/v4/topic', (req, res) => tmf688Controller.createTopic(req, res));
app.get('/tmf-api/event/v4/topic/:id', (req, res) => tmf688Controller.getTopicById(req, res));
app.delete('/tmf-api/event/v4/topic/:id', (req, res) => tmf688Controller.deleteTopic(req, res));

// Hubs
app.get('/tmf-api/event/v4/hub', (req, res) => tmf688Controller.getAllHubs(req, res));
app.post('/tmf-api/event/v4/hub', (req, res) => tmf688Controller.createHub(req, res));
app.get('/tmf-api/event/v4/hub/:id', (req, res) => tmf688Controller.getHubById(req, res));
app.delete('/tmf-api/event/v4/hub/:id', (req, res) => tmf688Controller.deleteHub(req, res));

// TMF760 - Product Configuration Management (MongoDB-based routes)
const tmf760Routes = require('./routes/tmf760Routes');
app.use('/tmf-api/productConfigurationManagement/v5', tmf760Routes);

// API Info Endpoints
app.get('/productCatalogManagement/v5', (req, res) => {
  res.json({
    title: 'TMF620 Product Catalog Management API',
    version: '5.0.0',
    description: 'TM Forum Product Catalog Management API with MongoDB storage',
    endpoints: {
      categories: '/productCatalogManagement/v5/category',
      productSpecifications: '/productCatalogManagement/v5/productSpecification',
      productOfferings: '/productCatalogManagement/v5/productOffering',
      productOfferingPrices: '/productCatalogManagement/v5/productOfferingPrice',
      productCatalogs: '/productCatalogManagement/v5/productCatalog'
    },
    storage: 'MongoDB'
  });
});

app.get('/tmf-api', (req, res) => {
  res.json({
    title: 'TMF637 Product Inventory Management API',
    version: '5.0.0',
    description: 'TM Forum Product Inventory Management API with MongoDB storage',
    endpoints: {
      products: '/tmf-api/product',
      hub: '/tmf-api/hub'
    },
    storage: 'MongoDB'
  });
});

app.get('/productOfferingQualification/v5', (req, res) => {
  res.json({
    title: 'TMF679 Product Offering Qualification API',
    version: '5.0.0',
    description: 'TM Forum Product Offering Qualification API with MongoDB storage',
    endpoints: {
      checkQualification: '/productOfferingQualification/v5/checkProductOfferingQualification',
      queryQualification: '/productOfferingQualification/v5/queryProductOfferingQualification'
    },
    storage: 'MongoDB'
  });
});

app.get('/productOrderingManagement/v4', (req, res) => {
  res.json({
    title: 'TMF622 Product Ordering Management API',
    version: '4.0.0',
    description: 'TM Forum Product Ordering Management API with MongoDB storage',
    endpoints: {
      productOrders: '/productOrderingManagement/v4/productOrder',
      cancelProductOrders: '/productOrderingManagement/v4/cancelProductOrder'
    },
    storage: 'MongoDB'
  });
});

app.get('/tmf-api/event/v4', (req, res) => {
  res.json({
    title: 'TMF688 Event Management API',
    version: '4.0.0',
    description: 'TM Forum Event Management API with MongoDB storage',
    endpoints: {
      events: '/tmf-api/event/v4/event',
      topics: '/tmf-api/event/v4/topic',
      hubs: '/tmf-api/event/v4/hub'
    },
    storage: 'MongoDB'
  });
});

// Additional health checks for individual APIs
app.get('/productCatalogManagement/v5/health', (req, res) => {
  res.json({
    api: 'TMF620',
    status: 'OK',
    storage: database.isConnected() ? 'MongoDB Connected' : 'MongoDB Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/tmf-api/health', (req, res) => {
  res.json({
    api: 'TMF637',
    status: 'OK',
    storage: database.isConnected() ? 'MongoDB Connected' : 'MongoDB Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/productOfferingQualification/v5/health', (req, res) => {
  res.json({
    api: 'TMF679',
    status: 'OK',
    storage: database.isConnected() ? 'MongoDB Connected' : 'MongoDB Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/productOrderingManagement/v4/health', (req, res) => {
  res.json({
    api: 'TMF622',
    status: 'OK',
    storage: database.isConnected() ? 'MongoDB Connected' : 'MongoDB Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/tmf-api/event/v4/health', (req, res) => {
  res.json({
    api: 'TMF688',
    status: 'OK',
    storage: database.isConnected() ? 'MongoDB Connected' : 'MongoDB Disconnected',
    timestamp: new Date().toISOString()
  });
});
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
      'TMF760': '/tmf-api/productConfigurationManagement/v5/'
    },
    storage: 'MongoDB'
  });
});

// ===================================
// SERVER START WITH MONGODB REQUIREMENT
// ===================================

async function startServer() {
  try {
    console.log('🚀 Starting ProdigyHub Unified TMF API Backend...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to MongoDB - REQUIRED for all APIs
    console.log('🗄️ Connecting to MongoDB...');
    await database.connect();
    console.log('✅ Database: Connected to MongoDB successfully');
    
    // Fix capped collection issue if it exists
    console.log('🔍 Checking for capped collection issues...');
    await fixCappedCollection();
    
    // Verify MongoDB models are available
    const models = require('./src/models/AllTMFModels');
    console.log('✅ MongoDB Models: All TMF API models loaded');
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 ProdigyHub Unified TMF API Backend Started (MongoDB)');
      console.log('='.repeat(70));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🗄️ Database: MongoDB Connected (${database.getStats().name})`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📋 Available APIs (All MongoDB-enabled):');
      console.log('  • TMF620 - Product Catalog: /productCatalogManagement/v5');
      console.log('  • TMF622 - Product Ordering: /productOrderingManagement/v4');
      console.log('  • TMF637 - Product Inventory: /tmf-api/product');
      console.log('  • TMF679 - Product Qualification: /productOfferingQualification/v5');
      console.log('  • TMF688 - Event Management: /tmf-api/event/v4');
      console.log('  • TMF760 - Product Configuration: /tmf-api/productConfigurationManagement/v5');
      console.log('');
      console.log('🔗 Endpoints:');
      console.log(`  • Health Check: http://localhost:${PORT}/health`);
      console.log(`  • API Info: http://localhost:${PORT}/`);
      console.log(`  • Debug Storage: http://localhost:${PORT}/debug/storage`);
      console.log('='.repeat(70));
      console.log('✅ All TMF APIs unified with MongoDB persistence!');
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('💡 Make sure MongoDB is running and accessible');
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('MongoNetworkError')) {
      console.error('🔗 Check your MongoDB connection string in .env file');
      console.error('🔗 Ensure your IP is whitelisted in MongoDB Atlas (if using Atlas)');
    }
    
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n📊 ${signal} received - initiating graceful shutdown...`);
  
  try {
    console.log('📊 Closing MongoDB connections...');
    await database.disconnect();
    console.log('✅ MongoDB disconnected gracefully');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  try {
    await database.disconnect();
  } catch (disconnectError) {
    console.error('❌ Error disconnecting during uncaught exception:', disconnectError.message);
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    await database.disconnect();
  } catch (disconnectError) {
    console.error('❌ Error disconnecting during unhandled rejection:', disconnectError.message);
  }
  process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGINT', gracefulShutdown);   // Ctrl+C
process.on('SIGTERM', gracefulShutdown);  // Termination signal
process.on('SIGUSR2', gracefulShutdown);  // Nodemon restart

// Start the server
console.log('🔄 Initializing ProdigyHub TMF API Backend with MongoDB...');
startServer().catch(console.error);

module.exports = app;