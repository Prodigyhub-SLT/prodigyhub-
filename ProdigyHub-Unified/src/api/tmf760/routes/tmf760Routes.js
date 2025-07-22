// ===================================================================
// Path: routes/tmf760Routes.js
// MongoDB-enabled TMF760 Routes
// ===================================================================

const express = require('express');
const router = express.Router();
const TMF760Controller = require('../controllers/TMF760Controller');

// Validation middleware
const validateCheckConfig = (req, res, next) => {
  const { checkProductConfigurationItem } = req.body;

  if (!checkProductConfigurationItem || !Array.isArray(checkProductConfigurationItem)) {
    return res.status(400).json({
      error: 'checkProductConfigurationItem is required and must be an array'
    });
  }

  for (const item of checkProductConfigurationItem) {
    if (!item['@type'] || !item.id) {
      return res.status(400).json({
        error: 'Each checkProductConfigurationItem must have @type and id'
      });
    }
  }
  next();
};

const validateQueryConfig = (req, res, next) => {
  const { requestProductConfigurationItem } = req.body;

  if (!requestProductConfigurationItem || !Array.isArray(requestProductConfigurationItem)) {
    return res.status(400).json({
      error: 'requestProductConfigurationItem is required and must be an array'
    });
  }

  for (const item of requestProductConfigurationItem) {
    if (!item['@type'] || !item.id) {
      return res.status(400).json({
        error: 'Each requestProductConfigurationItem must have @type and id'
      });
    }
  }
  next();
};

// ===================================
// CHECK PRODUCT CONFIGURATION ROUTES
// ===================================

// GET - List check configurations
router.get('/checkProductConfiguration', TMF760Controller.getCheckConfigurations);

// GET - Retrieve CheckProductConfiguration by ID
router.get('/checkProductConfiguration/:id', TMF760Controller.getCheckConfigurationById);

// POST - Create check configuration
router.post('/checkProductConfiguration', validateCheckConfig, TMF760Controller.createCheckConfiguration);

// DELETE - Delete check configuration
router.delete('/checkProductConfiguration/:id', TMF760Controller.deleteCheckConfiguration);

// ===================================
// QUERY PRODUCT CONFIGURATION ROUTES
// ===================================

// GET - List query configurations
router.get('/queryProductConfiguration', TMF760Controller.getQueryConfigurations);

// GET - Retrieve QueryProductConfiguration by ID
router.get('/queryProductConfiguration/:id', TMF760Controller.getQueryConfigurationById);

// POST - Create query configuration
router.post('/queryProductConfiguration', validateQueryConfig, TMF760Controller.createQueryConfiguration);

// DELETE - Delete query configuration
router.delete('/queryProductConfiguration/:id', TMF760Controller.deleteQueryConfiguration);

module.exports = router;