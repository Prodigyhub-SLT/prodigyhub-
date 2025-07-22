const { dataStore } = require('../models');
const { applyFieldSelection, validateRequiredFields, cleanForJsonResponse } = require('../utils/helpers');

module.exports = {
  listQueryPOQ: (req, res) => {
    try {
      const { fields, ...filters } = req.query;
      const poqList = dataStore.getAllQueryPOQ(filters);
      let result = poqList;
      if (fields) {
        result = poqList.map(poq => applyFieldSelection(poq, fields));
      } else {
        result = poqList.map(poq => cleanForJsonResponse(poq));
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  },

  getQueryPOQById: (req, res) => {
    try {
      const { id } = req.params;
      const { fields } = req.query;
      
      const poq = dataStore.getQueryPOQById(id);
      if (!poq) {
        return res.status(404).json({ error: 'Not Found', message: `QueryProductOfferingQualification with id ${id} not found` });
      }
      
      let result = poq;
      if (fields) {
        result = applyFieldSelection(poq, fields);
      } else {
        result = cleanForJsonResponse(poq);
      }
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  },

  createQueryPOQ: (req, res) => {
    try {
      const data = req.body;
      const validationError = validateRequiredFields(data, ['@type']);
      if (validationError) {
        return res.status(400).json({ error: 'Bad Request', message: validationError });
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
      
      const newPOQ = dataStore.createQueryPOQ(data);
      res.status(201).json(cleanForJsonResponse(newPOQ));
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  },

  updateQueryPOQ: (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const existingPOQ = dataStore.getQueryPOQById(id);
      if (!existingPOQ) {
        return res.status(404).json({ error: 'Not Found', message: `QueryProductOfferingQualification with id ${id} not found` });
      }
      const nonPatchableFields = ['id', 'href', 'creationDate'];
      nonPatchableFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          delete updates[field];
        }
      });
      
      // Ensure @baseType is string or null for TMF679 conformance
      if (updates['@baseType'] !== undefined && updates['@baseType'] !== null && typeof updates['@baseType'] !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: '@baseType must be string or null'
        });
      }
      
      const updatedPOQ = dataStore.updateQueryPOQ(id, updates);
      res.status(200).json(cleanForJsonResponse(updatedPOQ));
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  },

  deleteQueryPOQ: (req, res) => {
    try {
      const { id } = req.params;
      const deletedPOQ = dataStore.deleteQueryPOQ(id);
      if (!deletedPOQ) {
        return res.status(404).json({ error: 'Not Found', message: `QueryProductOfferingQualification with id ${id} not found` });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
};