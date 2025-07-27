// src/controllers/UnifiedControllers.js - MongoDB Controllers for All TMF APIs
const {
  Category, ProductSpecification, ProductOffering, ProductOfferingPrice, ProductCatalog,
  Product, CheckProductOfferingQualification, QueryProductOfferingQualification,
  ProductOrder, CancelProductOrder, Event, Hub, Topic
} = require('../models/AllTMFModels');
const { v4: uuidv4 } = require('uuid');

// ===================================
// SHARED UTILITY FUNCTIONS
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

const buildQuery = (Model, filters, fields) => {
  let query = Model.find(filters);
  
  if (fields) {
    const fieldList = fields.split(',').map(f => f.trim()).join(' ');
    query = query.select(`${fieldList} @type id href`);
  }
  
  return query;
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
// TMF620 - PRODUCT CATALOG CONTROLLERS
// ===================================

class TMF620Controller {
  // Category operations
  async getCategories(req, res) {
    try {
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      const query = buildQuery(Category, filters, fields);
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
      const { id } = req.params;
      const { fields } = req.query;
      
      const query = buildQuery(Category, { id }, fields);
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

  // Product Specification operations
  async getProductSpecifications(req, res) {
    try {
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      const query = buildQuery(ProductSpecification, filters, fields);
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
      const { id } = req.params;
      const { fields } = req.query;
      
      const query = buildQuery(ProductSpecification, { id }, fields);
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

  // Product Offering operations
  async getProductOfferings(req, res) {
    try {
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      const query = buildQuery(ProductOffering, filters, fields);
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
      const { id } = req.params;
      const { fields } = req.query;
      
      const query = buildQuery(ProductOffering, { id }, fields);
      const offering = await query;
      
      if (!offering) {
        return res.status(404).json({ error: 'ProductOffering not found' });
      }
      
      res.json(offering);
    } catch (error) {
      handleError(res, error, 'get product offering by ID');
    }
  }

  async createProductOffering(req, res) {
    try {
      const offeringData = {
        ...req.body,
        '@type': 'ProductOffering'
      };
      
      const offering = new ProductOffering(offeringData);
      await offering.save();
      
      res.status(201).json(offering);
    } catch (error) {
      handleError(res, error, 'create product offering');
    }
  } }