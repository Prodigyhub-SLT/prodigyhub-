// src/shared/utils/helpers.js
const { v4: uuidv4 } = require('uuid');
const httpCodes = require('../constants/httpCodes');

/**
 * Generate unique ID with optional prefix
 */
const generateId = (prefix = '') => {
  const uuid = uuidv4();
  return prefix ? `${prefix}-${uuid}` : uuid;
};

/**
 * Ensure string fields are never null
 */
const ensureString = (value, defaultValue = '') => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
};

/**
 * Apply field selection to an object
 */
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

/**
 * Paginate array results
 */
const paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);
  
  return {
    data: paginatedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: offset + limit < array.length,
      hasPrev: page > 1
    }
  };
};

/**
 * Validate required fields
 */
const validateRequiredFields = (obj, requiredFields = []) => {
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (!obj.hasOwnProperty(field) || obj[field] === undefined || obj[field] === null) {
      missingFields.push(field);
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Create standardized success response
 */
const createSuccessResponse = (data, statusCode = httpCodes.OK, message = null) => {
  return {
    success: true,
    statusCode,
    message: message || httpCodes.SUCCESS_MESSAGES.RETRIEVED,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create standardized error response
 */
const createErrorResponse = (message, statusCode = httpCodes.INTERNAL_SERVER_ERROR, details = null) => {
  return {
    success: false,
    statusCode,
    error: message,
    details,
    timestamp: new Date().toISOString()
  };
};

/**
 * Filter objects based on criteria
 */
const filterObjects = (objects, filters) => {
  if (!filters || Object.keys(filters).length === 0) {
    return objects;
  }
  
  return objects.filter(obj => {
    return Object.entries(filters).every(([key, value]) => {
      if (key === 'fields' || key === 'limit' || key === 'offset' || key === 'page') {
        return true; // Skip pagination and field selection params
      }
      
      // Handle nested properties with dot notation
      const objValue = getNestedProperty(obj, key);
      
      if (objValue === undefined) {
        return false;
      }
      
      // Handle date filtering
      if (key.includes('Date') && typeof objValue === 'string') {
        try {
          const objDate = new Date(objValue);
          const filterDate = new Date(value);
          return objDate.toDateString() === filterDate.toDateString();
        } catch (error) {
          return false;
        }
      }
      
      // Handle string comparison (case-insensitive)
      return objValue.toString().toLowerCase() === value.toString().toLowerCase();
    });
  });
};

/**
 * Get nested property value using dot notation
 */
const getNestedProperty = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Generate TMF-compliant href
 */
const generateHref = (baseUrl, apiPath, resourceType, id) => {
  return `${baseUrl}${apiPath}/${resourceType}/${id}`;
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Check if object is empty
 */
const isEmpty = (obj) => {
  if (obj === null || obj === undefined) {
    return true;
  }
  
  if (Array.isArray(obj)) {
    return obj.length === 0;
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  
  return false;
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  
  return cloned;
};

/**
 * Format date to ISO string
 */
const formatDate = (date) => {
  if (!date) {
    return new Date().toISOString();
  }
  
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  return new Date().toISOString();
};

/**
 * Calculate time difference in milliseconds
 */
const timeDiff = (startTime, endTime = new Date()) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return end.getTime() - start.getTime();
};

module.exports = {
  generateId,
  ensureString,
  applyFieldSelection,
  paginate,
  validateRequiredFields,
  createSuccessResponse,
  createErrorResponse,
  filterObjects,
  getNestedProperty,
  generateHref,
  sanitizeInput,
  isEmpty,
  deepClone,
  formatDate,
  timeDiff
};