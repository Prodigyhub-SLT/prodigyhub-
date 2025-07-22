// src/api/tmf637/controllers/ProductInventoryController.js
const { v4: uuidv4 } = require('uuid');

class ProductInventoryController {
  constructor() {
    this.products = [];
    this.hubs = [];
  }

  generateId(prefix) {
    return `${prefix}-${uuidv4()}`;
  }

  // Utility function to ensure string fields are never null
  ensureString(value, defaultValue = '') {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }

  // GET all products
  getAllProducts(req, res) {
    let result = [...this.products];

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
  }

  // GET single product by ID
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
  }

  // POST create new product
  createProduct(req, res) {
    const data = req.body;
    const id = this.generateId('prod');
    const timestamp = new Date().toISOString();

    const newProduct = {
      // Core identifiers
      id: id,
      href: `http://localhost:3000/tmf-api/product/${id}`,
      
      // Basic product info - ensure all strings are never null
      name: this.ensureString(data.name, 'Default Product Name'),
      description: this.ensureString(data.description, 'Default product description'),
      status: this.ensureString(data.status, 'created'),
      
      // Timestamps - must be strings in ISO format
      creationDate: timestamp,
      lastUpdate: timestamp,
      startDate: this.ensureString(data.startDate, timestamp),
      terminationDate: this.ensureString(data.terminationDate, ''), // Empty string instead of null
      
      // Boolean flags
      isBundle: Boolean(data.isBundle),
      isCustomerVisible: data.isCustomerVisible !== undefined ? Boolean(data.isCustomerVisible) : true,
      
      // String fields that must never be null
      productSerialNumber: this.ensureString(data.productSerialNumber, ''), // This was causing the error
      
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

    this.products.push(newProduct);
    res.status(201).json(newProduct);
  }

  // PATCH update existing product
  updateProduct(req, res) {
    const productId = req.params.id;
    const productIndex = this.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `Product with id ${productId} does not exist`
      });
    }

    // Update product with new data
    const updatedProduct = {
      ...this.products[productIndex],
      ...req.body,
      id: productId, // Ensure ID cannot be changed
      lastUpdate: new Date().toISOString()
    };

    // Ensure critical string fields are never empty or null
    updatedProduct.name = this.ensureString(updatedProduct.name, 'Updated Product Name');
    updatedProduct.description = this.ensureString(updatedProduct.description, 'Updated description');
    updatedProduct.status = this.ensureString(updatedProduct.status, 'active');
    updatedProduct.productSerialNumber = this.ensureString(updatedProduct.productSerialNumber, '');
    updatedProduct.terminationDate = this.ensureString(updatedProduct.terminationDate, '');

    this.products[productIndex] = updatedProduct;
    res.status(200).json(updatedProduct);
  }

  // DELETE product
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
    res.status(204).send(); // No content response for successful deletion
  }

  // POST create hub
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

  // DELETE hub
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

module.exports = ProductInventoryController;