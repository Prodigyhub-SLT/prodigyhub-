const { dataStore } = require('../models');
const { applyFieldSelection, validateRequiredFields, cleanForJsonResponse } = require('../utils/helpers');

const checkProductOfferingQualificationController = {
  
  // GET /checkProductOfferingQualification
  listCheckPOQ: (req, res) => {
    try {
      const { fields, ...filters } = req.query;
      
      // Get all CheckPOQ with filters
      const poqList = dataStore.getAllCheckPOQ(filters);
      
      // Apply field selection if specified
      let result = poqList;
      if (fields) {
        result = poqList.map(poq => applyFieldSelection(poq, fields));
      } else {
        result = poqList.map(poq => cleanForJsonResponse(poq));
      }
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // GET /checkProductOfferingQualification/{id}
  getCheckPOQById: (req, res) => {
    try {
      const { id } = req.params;
      const { fields } = req.query;
      
      const poq = dataStore.getCheckPOQById(id);
      
      if (!poq) {
        return res.status(404).json({
          error: 'Not Found',
          message: `CheckProductOfferingQualification with id ${id} not found`
        });
      }
      
      // Apply field selection if specified
      let result = poq;
      if (fields) {
        result = applyFieldSelection(poq, fields);
      } else {
        result = cleanForJsonResponse(poq);
      }
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // POST /checkProductOfferingQualification
  createCheckPOQ: (req, res) => {
    try {
      const data = req.body;
      
      // Basic validation
      const validationError = validateRequiredFields(data, ['@type']);
      if (validationError) {
        return res.status(400).json({
          error: 'Bad Request',
          message: validationError
        });
      }
      
      // Ensure @baseType is string when provided
      if (data['@baseType'] !== undefined && typeof data['@baseType'] !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: '@baseType must be string'
        });
      }
      
      // Ensure @schemaLocation is string when provided  
      if (data['@schemaLocation'] !== undefined && typeof data['@schemaLocation'] !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: '@schemaLocation must be string'
        });
      }
      
      // Create new CheckPOQ
      const newPOQ = dataStore.createCheckPOQ(data);
      
      res.status(201).json(cleanForJsonResponse(newPOQ));
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // PATCH /checkProductOfferingQualification/{id}
  updateCheckPOQ: (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check if POQ exists
      const existingPOQ = dataStore.getCheckPOQById(id);
      if (!existingPOQ) {
        return res.status(404).json({
          error: 'Not Found',
          message: `CheckProductOfferingQualification with id ${id} not found`
        });
      }
      
      // Prevent updating non-patchable attributes
      const nonPatchableFields = ['id', 'href', 'creationDate'];
      nonPatchableFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          delete updates[field];
        }
      });
      
      // Ensure @baseType is string when provided
      if (updates['@baseType'] !== undefined && typeof updates['@baseType'] !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: '@baseType must be string'
        });
      }
      
      // Ensure @schemaLocation is string when provided
      if (updates['@schemaLocation'] !== undefined && typeof updates['@schemaLocation'] !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: '@schemaLocation must be string'
        });
      }
      
      // Update POQ
      const updatedPOQ = dataStore.updateCheckPOQ(id, updates);
      
      res.status(200).json(cleanForJsonResponse(updatedPOQ));
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // DELETE /checkProductOfferingQualification/{id}
  deleteCheckPOQ: (req, res) => {
    try {
      const { id } = req.params;
      
      const deletedPOQ = dataStore.deleteCheckPOQ(id);
      
      if (!deletedPOQ) {
        return res.status(404).json({
          error: 'Not Found',
          message: `CheckProductOfferingQualification with id ${id} not found`
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
};

module.exports = checkProductOfferingQualificationController;