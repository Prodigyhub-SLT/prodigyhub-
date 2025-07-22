// src/routes/productCatalogs.js - NEW FILE
const express = require('express');
const router = express.Router();

let productCatalogs = [];
let idCounter = 1;

const applyFieldSelection = (data, fields) => {
  if (!fields) return data;
  
  const selectedFields = fields.split(',').map(f => f.trim());
  const result = {};
  
  selectedFields.forEach(field => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  });
  
  // Always include @type, id, and href for schema validation
  result['@type'] = data['@type'];
  result['id'] = data['id'];
  result['href'] = data['href'];
  
  return result;
};

const ensureNestedTypes = (data) => {
  const result = { ...data };
  
  // Fix category array
  if (Array.isArray(result.category)) {
    result.category = result.category.map(cat => ({
      ...cat,
      '@type': 'CategoryRef'
    }));
  }
  
  // Fix relatedParty array
  if (Array.isArray(result.relatedParty)) {
    result.relatedParty = result.relatedParty.map(party => ({
      ...party,
      '@type': 'RelatedPartyRefOrPartyRoleRef'
    }));
  }
  
  return result;
};

const createProductCatalogResponse = (data) => {
  const id = data.id || (idCounter++).toString();
  
  const result = {
    id,
    href: `/productCatalogManagement/v5/productCatalog/${id}`,
    name: data.name || 'Default Product Catalog',
    description: data.description || '',
    catalogType: data.catalogType || 'ProductCatalog',
    version: data.version || '1.0',
    lifecycleStatus: data.lifecycleStatus || 'Active',
    validFor: data.validFor || {},
    lastUpdate: new Date().toISOString(),
    category: [],
    relatedParty: [],
    '@type': 'Catalog'
  };
  
  // Handle category array with @type
  if (Array.isArray(data.category)) {
    result.category = data.category.map(cat => ({
      ...cat,
      '@type': 'CategoryRef'
    }));
  }
  
  // Handle relatedParty array with @type
  if (Array.isArray(data.relatedParty)) {
    result.relatedParty = data.relatedParty.map(party => ({
      ...party,
      '@type': 'RelatedPartyRefOrPartyRoleRef'
    }));
  }
  
  return result;
};

// GET all catalogs
router.get('/', (req, res, next) => {
  try {
    const { fields, ...filters } = req.query;
    let results = productCatalogs.map(catalog => ensureNestedTypes(catalog));
    
    if (Object.keys(filters).length > 0) {
      results = results.filter(catalog => {
        return Object.entries(filters).every(([key, value]) => {
          return catalog[key] === value;
        });
      });
    }
    
    if (fields) {
      results = results.map(catalog => applyFieldSelection(catalog, fields));
    }
    
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

// GET single catalog
router.get('/:id', (req, res, next) => {
  try {
    const { fields } = req.query;
    let catalog = productCatalogs.find(c => c.id === req.params.id);

    if (!catalog) {
      return res.status(404).json({
        success: false,
        error: 'Product catalog not found'
      });
    }

    catalog = ensureNestedTypes(catalog);

    if (fields) {
      catalog = applyFieldSelection(catalog, fields);
    }

    res.status(200).json(catalog);
  } catch (error) {
    next(error);
  }
});

// POST new catalog
router.post('/', (req, res, next) => {
  try {
    const catalog = createProductCatalogResponse(req.body);
    productCatalogs.push(catalog);
    res.status(201).json(catalog);
  } catch (error) {
    next(error);
  }
});

// PATCH existing catalog
router.patch('/:id', (req, res, next) => {
  try {
    const index = productCatalogs.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product catalog not found'
      });
    }

    let updatedCatalog = {
      ...productCatalogs[index],
      ...req.body,
      id: productCatalogs[index].id,
      href: productCatalogs[index].href,
      lastUpdate: new Date().toISOString(),
      '@type': 'Catalog'
    };

    // Handle arrays with proper @type assignment
    const arrayFields = [
      { field: 'category', type: 'CategoryRef' },
      { field: 'relatedParty', type: 'RelatedPartyRefOrPartyRoleRef' }
    ];

    arrayFields.forEach(({ field, type }) => {
      if (req.body[field] || productCatalogs[index][field]) {
        const items = req.body[field] || productCatalogs[index][field] || [];
        updatedCatalog[field] = items.map(item => ({
          ...item,
          '@type': type
        }));
      }
    });

    productCatalogs[index] = updatedCatalog;
    res.status(200).json(updatedCatalog);
  } catch (error) {
    next(error);
  }
});

// DELETE catalog
router.delete('/:id', (req, res, next) => {
  try {
    const index = productCatalogs.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product catalog not found'
      });
    }

    productCatalogs.splice(index, 1);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

module.exports = router;