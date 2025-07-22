// src/shared/utils/validation.js
const Joi = require('joi');
const { TMF_TYPES } = require('../constants/tmfTypes');

/**
 * Common validation schemas
 */
const commonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid(),
  
  // TMF ID validation (can be UUID or string)
  tmfId: Joi.string().min(1).max(255),
  
  // TMF @type validation
  tmfType: Joi.string().required(),
  
  // TMF href validation
  href: Joi.string().uri(),
  
  // Date validation
  isoDate: Joi.date().iso(),
  
  // Money schema
  money: Joi.object({
    unit: Joi.string().required(),
    value: Joi.number().required()
  }),
  
  // Duration schema
  duration: Joi.object({
    amount: Joi.number().required(),
    units: Joi.string().required()
  }),
  
  // Note schema
  note: Joi.object({
    id: Joi.string(),
    author: Joi.string(),
    date: Joi.date().iso(),
    text: Joi.string(),
    '@type': Joi.string().default('Note')
  }),
  
  // Related Party schema
  relatedParty: Joi.object({
    id: Joi.string().required(),
    name: Joi.string(),
    role: Joi.string().required(),
    '@type': Joi.string().default('RelatedPartyRefOrPartyRoleRef')
  }),
  
  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),
  
  // Field selection
  fields: Joi.string().pattern(/^[a-zA-Z0-9,._@\-\s]+$/)
};

/**
 * Validate request query parameters
 */
const validateQueryParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      stripUnknown: true,
      abortEarly: false
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.query = value;
    next();
  };
};

/**
 * Validate request body
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};

/**
 * Validate request parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      stripUnknown: true,
      abortEarly: false
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.params = value;
    next();
  };
};

/**
 * TMF-specific validation helpers
 */
const tmfValidation = {
  // Validate TMF @type field
  validateType: (expectedType) => {
    return (req, res, next) => {
      if (req.body['@type'] && req.body['@type'] !== expectedType) {
        return res.status(400).json({
          error: 'Invalid @type',
          message: `Expected @type to be '${expectedType}', got '${req.body['@type']}'`
        });
      }
      
      // Set @type if not provided
      if (!req.body['@type']) {
        req.body['@type'] = expectedType;
      }
      
      next();
    };
  },
  
  // Validate required TMF fields
  validateRequiredFields: (fields) => {
    return (req, res, next) => {
      const missing = fields.filter(field => {
        return !req.body.hasOwnProperty(field) || 
               req.body[field] === null || 
               req.body[field] === undefined;
      });
      
      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          missing: missing
        });
      }
      
      next();
    };
  }
};

/**
 * Common query validation schemas for different APIs
 */
const querySchemas = {
  // Basic list query with pagination and field selection
  list: Joi.object({
    fields: commonSchemas.fields,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),
  
  // TMF620 Product Catalog queries
  productCatalog: Joi.object({
    fields: commonSchemas.fields,
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    lifecycleStatus: Joi.string().valid('Active', 'Inactive', 'Retired'),
    category: Joi.string(),
    name: Joi.string()
  }),
  
  // TMF637 Product Inventory queries
  productInventory: Joi.object({
    fields: commonSchemas.fields,
    id: Joi.string(),
    status: Joi.string().valid('created', 'active', 'suspended', 'terminated'),
    customerId: Joi.string()
  }),
  
  // TMF622 Product Order queries
  productOrder: Joi.object({
    fields: commonSchemas.fields,
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    state: Joi.string().valid(
      'acknowledged', 'rejected', 'pending', 'held', 'inProgress',
      'cancelled', 'completed', 'failed', 'partial'
    ),
    category: Joi.string(),
    priority: Joi.string().valid('0', '1', '2', '3', '4'),
    'relatedParty.id': Joi.string(),
    'creationDate.gte': Joi.date().iso(),
    'creationDate.lte': Joi.date().iso()
  }),
  
  // TMF688 Event queries
  event: Joi.object({
    eventType: Joi.string(),
    domain: Joi.string(),
    priority: Joi.string().valid('Low', 'Normal', 'High', 'Critical'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

/**
 * Parameter validation schemas
 */
const paramSchemas = {
  // Standard ID parameter
  id: Joi.object({
    id: commonSchemas.tmfId.required()
  })
};

module.exports = {
  commonSchemas,
  validateQueryParams,
  validateBody,
  validateParams,
  tmfValidation,
  querySchemas,
  paramSchemas
};