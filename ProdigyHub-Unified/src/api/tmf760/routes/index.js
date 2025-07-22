// backend/routes/index.js
const express = require('express');
const router = express.Router();

const checkProductConfigurationRoutes = require('./checkProductConfiguration');
const queryProductConfigurationRoutes = require('./queryProductConfiguration');

// Mount routes
router.use('/checkProductConfiguration', checkProductConfigurationRoutes);
router.use('/queryProductConfiguration', queryProductConfigurationRoutes);

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    title: 'TMF760 Product Configuration API',
    version: '5.0.0',
    description: 'TM Forum Product Configuration Management API',
    endpoints: {
      checkProductConfiguration: {
        path: '/tmf-api/productConfiguration/v5/checkProductConfiguration',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Check and validate product configurations'
      },
      queryProductConfiguration: {
        path: '/tmf-api/productConfiguration/v5/queryProductConfiguration',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Query and compute product configurations'
      }
    },
    compliance: 'TM Forum TMF760 v5.0.0'
  });
});

module.exports = router;