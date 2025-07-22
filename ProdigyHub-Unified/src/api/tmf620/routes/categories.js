// src/routes/categories.js - FIXED VERSION
const express = require('express');
const router = express.Router();

// Simple in-memory storage
let categories = [];
let idCounter = 1;

// Helper function to apply field selection
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

// Helper function to create a category with required fields
const createCategoryResponse = (data) => {
  const id = data.id || (idCounter++).toString();
  return {
    id,
    href: `/productCatalogManagement/v5/category/${id}`,
    name: data.name || 'Default Category',
    description: data.description || '',
    version: data.version || '1.0',
    isRoot: data.isRoot || false,
    lifecycleStatus: data.lifecycleStatus || 'Active',
    validFor: data.validFor || {},
    lastUpdate: new Date().toISOString(),
    '@type': 'Category'
  };
};

router.get('/', (req, res, next) => {
  try {
    const { fields, ...filters } = req.query;
    let results = categories;
    
    if (Object.keys(filters).length > 0) {
      results = categories.filter(category => {
        return Object.entries(filters).every(([key, value]) => {
          return category[key] === value;
        });
      });
    }
    
    if (fields) {
      results = results.map(category => applyFieldSelection(category, fields));
    }
    
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const { fields } = req.query;
    let category = categories.find(c => c.id === req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (fields) {
      category = applyFieldSelection(category, fields);
    }

    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const category = createCategoryResponse(req.body);
    categories.push(category);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', (req, res, next) => {
  try {
    const index = categories.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    categories[index] = {
      ...categories[index],
      ...req.body,
      id: categories[index].id,
      href: categories[index].href,
      lastUpdate: new Date().toISOString(),
      '@type': 'Category'
    };

    res.status(200).json(categories[index]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const index = categories.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    categories.splice(index, 1);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

module.exports = router;