const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = 80;
const basePath = '/tmf-api';

let products = [];
let hubs = [];

function generateId(prefix) {
  return `${prefix}-${uuidv4()}`;
}

// Utility function to ensure string fields are never null
function ensureString(value, defaultValue = '') {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

// Base path info
app.get(basePath, (req, res) => {
  res.json({
    message: 'TMF637 ProductInventory API is running',
    version: '5.0.0',
    totalProducts: products.length,
    totalHubs: hubs.length,
    endpoints: [
      'GET /product - List all products',
      'GET /product/{id} - Get specific product', 
      'POST /product - Create new product',
      'PATCH /product/{id} - Update existing product',
      'DELETE /product/{id} - Delete product',
      'POST /hub - Register notification hub',
      'DELETE /hub/{id} - Unregister notification hub'
    ]
  });
});

// GET all products
app.get(`${basePath}/product`, (req, res) => {
  let result = [...products];

  // Filter by ID if provided
  if (req.query.id) {
    result = result.filter(p => p.id === req.query.id);
  }

  // Filter by status if provided
  if (req.query.status) {
    result = result.filter(p => p.status === req.query.status);
  }

  // Handle field selection
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
});

// GET single product by ID
app.get(`${basePath}/product/:id`, (req, res) => {
  const productId = req.params.id;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ 
      error: 'Product not found',
      message: `Product with id ${productId} does not exist`
    });
  }

  let result = { ...product };

  // Handle field selection for single product
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
});

// POST create new product
app.post(`${basePath}/product`, (req, res) => {
  const data = req.body;
  const id = generateId('prod');
  const timestamp = new Date().toISOString();

  const newProduct = {
    // Core identifiers
    id: id,
    href: `http://localhost${basePath}/product/${id}`,
    
    // Basic product info - ensure all strings are never null
    name: ensureString(data.name, 'Default Product Name'),
    description: ensureString(data.description, 'Default product description'),
    status: ensureString(data.status, 'created'),
    
    // Timestamps - must be strings in ISO format
    creationDate: timestamp,
    lastUpdate: timestamp,
    startDate: ensureString(data.startDate, timestamp),
    terminationDate: ensureString(data.terminationDate, ''), // Empty string instead of null
    
    // Boolean flags
    isBundle: Boolean(data.isBundle),
    isCustomerVisible: data.isCustomerVisible !== undefined ? Boolean(data.isCustomerVisible) : true,
    
    // String fields that must never be null
    productSerialNumber: ensureString(data.productSerialNumber, ''), // This was causing the error
    
    // TMF required metadata
    '@type': 'Product',
    '@baseType': 'BaseProduct',
    '@schemaLocation': 'http://example.com/schema/Product',
    
    // Optional arrays - initialize as empty if not provided
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
      id: ensureString(data.productSpecification.id, 'default-spec-id'),
      href: ensureString(data.productSpecification.href, `http://localhost/productSpecification/${data.productSpecification.id || 'default-spec-id'}`),
      name: ensureString(data.productSpecification.name, 'Default Specification'),
      version: ensureString(data.productSpecification.version, '1.0'),
      ...data.productSpecification
    };
  }

  if (data.billingAccount) {
    newProduct.billingAccount = {
      id: ensureString(data.billingAccount.id, 'default-billing-id'),
      href: ensureString(data.billingAccount.href, `http://localhost/billingAccount/${data.billingAccount.id || 'default-billing-id'}`),
      name: ensureString(data.billingAccount.name, 'Default Billing Account'),
      ...data.billingAccount
    };
  }

  if (data.productOffering) {
    newProduct.productOffering = {
      id: ensureString(data.productOffering.id, 'default-offering-id'),
      href: ensureString(data.productOffering.href, `http://localhost/productOffering/${data.productOffering.id || 'default-offering-id'}`),
      name: ensureString(data.productOffering.name, 'Default Product Offering'),
      ...data.productOffering
    };
  }

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PATCH update existing product
app.patch(`${basePath}/product/:id`, (req, res) => {
  const productId = req.params.id;
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({ 
      error: 'Product not found',
      message: `Product with id ${productId} does not exist`
    });
  }

  // Update product with new data
  const updatedProduct = {
    ...products[productIndex],
    ...req.body,
    id: productId, // Ensure ID cannot be changed
    lastUpdate: new Date().toISOString()
  };

  // Ensure critical string fields are never empty or null
  updatedProduct.name = ensureString(updatedProduct.name, 'Updated Product Name');
  updatedProduct.description = ensureString(updatedProduct.description, 'Updated description');
  updatedProduct.status = ensureString(updatedProduct.status, 'active');
  updatedProduct.productSerialNumber = ensureString(updatedProduct.productSerialNumber, '');
  updatedProduct.terminationDate = ensureString(updatedProduct.terminationDate, '');

  products[productIndex] = updatedProduct;
  res.status(200).json(updatedProduct);
});

// DELETE product
app.delete(`${basePath}/product/:id`, (req, res) => {
  const productId = req.params.id;
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({ 
      error: 'Product not found',
      message: `Product with id ${productId} does not exist`
    });
  }

  products.splice(productIndex, 1);
  res.status(204).send(); // No content response for successful deletion
});

/* ------------------ Hub Management ------------------ */

app.post(`${basePath}/hub`, (req, res) => {
  const { callback } = req.body;
  
  if (!callback) {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Callback URL is required' 
    });
  }

  const hubId = generateId('hub');
  const newHub = { 
    id: hubId, 
    callback: ensureString(callback),
    creationDate: new Date().toISOString()
  };
  
  hubs.push(newHub);
  res.status(201).json(newHub);
});

app.delete(`${basePath}/hub/:id`, (req, res) => {
  const hubId = req.params.id;
  const hubIndex = hubs.findIndex(h => h.id === hubId);
  
  if (hubIndex === -1) {
    return res.status(404).json({ 
      error: 'Hub not found',
      message: `Hub with id ${hubId} does not exist`
    });
  }

  hubs.splice(hubIndex, 1);
  res.status(204).send();
});

// Health check endpoint
app.get(`${basePath}/health`, (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    products: products.length,
    hubs: hubs.length
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TMF637 API running at http://localhost:${PORT}${basePath}`);
  console.log(`📊 Health check: http://localhost:${PORT}${basePath}/health`);
  console.log(`ℹ️  API info: http://localhost:${PORT}${basePath}`);
  console.log(`📝 Current products: ${products.length}`);
  console.log(`🔔 Current hubs: ${hubs.length}`);
  console.log(`✅ Schema compliance: String fields will never be null`);
});