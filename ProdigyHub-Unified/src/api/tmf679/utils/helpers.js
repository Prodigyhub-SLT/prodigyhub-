/**
 * Clean object for JSON response - removes null values for fields that schema expects as strings
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
const cleanForJsonResponse = (obj) => {
  const cleaned = { ...obj };
  
  // Remove fields that are null and should be strings when present
  const stringOnlyFields = [
    'effectiveQualificationDate', 
    'qualificationResult',
    'expectedQualificationCompletionDate',
    'expirationDate',
    'requestedQualificationCompletionDate'
  ];
  
  stringOnlyFields.forEach(field => {
    if (cleaned[field] === null) {
      delete cleaned[field];
    }
  });
  
  // Remove @schemaLocation if it's null, undefined, or empty
  if (!cleaned['@schemaLocation']) {
    delete cleaned['@schemaLocation'];
  }
  
  // Handle searchCriteria - remove if null or add @type if it exists but doesn't have one
  if (cleaned.searchCriteria === null || cleaned.searchCriteria === undefined) {
    delete cleaned.searchCriteria;
  } else if (cleaned.searchCriteria && typeof cleaned.searchCriteria === 'object' && !cleaned.searchCriteria['@type']) {
    cleaned.searchCriteria['@type'] = 'SearchCriteria';
  }
  
  return cleaned;
};

/**
 * Apply field selection to an object based on fields query parameter
 * @param {Object} obj - The object to filter
 * @param {String} fields - Comma-separated list of fields to include
 * @returns {Object} Filtered object
 */
const applyFieldSelection = (obj, fields) => {
  if (!fields || typeof fields !== 'string') {
    return cleanForJsonResponse(obj);
  }
  
  const fieldsArray = fields.split(',').map(field => field.trim());
  const result = {};
  
  // TMF679 requires these fields to always be present
  result['@type'] = obj['@type'];
  result.id = obj.id;
  result.href = obj.href;
  
  // Add the specifically requested fields
  fieldsArray.forEach(field => {
    if (obj.hasOwnProperty(field) && !result.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
  });
  
  return cleanForJsonResponse(result);
};

/**
 * Validate required fields in an object
 * @param {Object} obj - Object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {String|null} Error message or null if valid
 */
const validateRequiredFields = (obj, requiredFields = []) => {
  for (const field of requiredFields) {
    if (!obj.hasOwnProperty(field) || obj[field] === undefined || obj[field] === null) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
};

/**
 * Filter objects based on query parameters
 * @param {Array} array - Array of objects to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered array
 */
const applyFilters = (array, filters) => {
  return array.filter(item => {
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'fields') continue; // Skip fields parameter
      
      if (item[key] !== value) {
        return false;
      }
    }
    return true;
  });
};

/**
 * Generate a mock product offering reference
 * @param {String} id - Product offering ID
 * @param {String} name - Product offering name
 * @returns {Object} Product offering reference object
 */
const generateProductOfferingRef = (id, name) => {
  return {
    id,
    name,
    href: `http://localhost:3000/productCatalogManagement/v5/productOffering/${id}`,
    '@type': 'ProductOfferingRef'
  };
};

/**
 * Generate a mock party reference
 * @param {String} id - Party ID
 * @param {String} name - Party name
 * @param {String} type - Party type (Individual, Organization)
 * @returns {Object} Party reference object
 */
const generatePartyRef = (id, name, type = 'Individual') => {
  return {
    id,
    name,
    href: `http://localhost:3000/partyManagement/v5/${type.toLowerCase()}/${id}`,
    '@type': 'RelatedPartyOrPartyRole',
    '@referredType': type
  };
};

/**
 * Generate a mock channel reference
 * @param {String} id - Channel ID
 * @param {String} name - Channel name
 * @returns {Object} Channel reference object
 */
const generateChannelRef = (id, name) => {
  return {
    id,
    name,
    '@type': 'ChannelRef'
  };
};

/**
 * Generate a mock note
 * @param {String} text - Note text
 * @param {String} author - Note author
 * @returns {Object} Note object
 */
const generateNote = (text, author = 'System') => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    text,
    author,
    date: new Date().toISOString(),
    '@type': 'Note'
  };
};

/**
 * Validate JSON structure against basic schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Basic schema definition
 * @returns {Array} Array of validation errors
 */
const validateSchema = (obj, schema) => {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    if (value !== undefined && rules.type && typeof value !== rules.type) {
      errors.push(`Field '${field}' must be of type ${rules.type}`);
    }
    
    if (value !== undefined && rules.enum && !rules.enum.includes(value)) {
      errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
    }
  }
  
  return errors;
};

module.exports = {
  applyFieldSelection,
  validateRequiredFields,
  applyFilters,
  generateProductOfferingRef,
  generatePartyRef,
  generateChannelRef,
  generateNote,
  validateSchema,
  cleanForJsonResponse
};