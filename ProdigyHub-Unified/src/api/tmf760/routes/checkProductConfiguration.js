// backend/routes/checkProductConfiguration.js
const express = require('express');
const router = express.Router();
const CheckProductConfiguration = require('../models/CheckProductConfiguration');
const { validateCheckProductConfiguration, validateProductConfiguration } = require('../middleware/validation');
const eventService = require('../services/eventService');

// GET /checkProductConfiguration - List or find CheckProductConfiguration objects
router.get('/', async (req, res) => {
  try {
    const { fields, limit = 10, offset = 0, ...filters } = req.query;
    
    let query = CheckProductConfiguration.find(filters);
    
    if (fields) {
      const fieldList = fields.split(',').join(' ');
      query = query.select(fieldList);
    }
    
    const configurations = await query
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });
    
    res.json(configurations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /checkProductConfiguration/:id - Retrieve CheckProductConfiguration by ID
router.get('/:id', async (req, res) => {
  try {
    const { fields } = req.query;
    let query = CheckProductConfiguration.findOne({ id: req.params.id });
    
    if (fields) {
      const fieldList = fields.split(',').join(' ');
      query = query.select(fieldList);
    }
    
    const configuration = await query;
    
    if (!configuration) {
      return res.status(404).json({ error: 'CheckProductConfiguration not found' });
    }
    
    res.json(configuration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /checkProductConfiguration - Create CheckProductConfiguration
router.post('/', validateCheckProductConfiguration, async (req, res) => {
  try {
    const configData = {
      ...req.body,
      '@type': 'CheckProductConfiguration'
    };

    // Process configuration items and set default state to 'done' if instantSync
    if (configData.instantSync) {
      configData.state = 'done';
      
      // Validate each configuration item
      configData.checkProductConfigurationItem = configData.checkProductConfigurationItem.map(item => {
        // Validate product configuration
        const validationErrors = validateProductConfiguration(item.productConfiguration);
        const isValid = validationErrors.length === 0;

        return {
          ...item,
          state: isValid ? 'approved' : 'rejected',
          stateReason: isValid ? [] : validationErrors.map((error, index) => ({
            code: `${123 + index}`,
            label: error,
            '@type': 'StateReason'
          }))
        };
      });
    }

    const configuration = new CheckProductConfiguration(configData);
    await configuration.save();
    
    // Emit create event
    eventService.emitCheckProductConfigurationEvent('Create', configuration);
    
    const statusCode = configData.instantSync ? 200 : 201;
    res.status(statusCode).json(configuration);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.values(error.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /checkProductConfiguration/:id - Update CheckProductConfiguration
router.patch('/:id', async (req, res) => {
  try {
    const configuration = await CheckProductConfiguration.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!configuration) {
      return res.status(404).json({ error: 'CheckProductConfiguration not found' });
    }
    
    // Emit state change event
    eventService.emitCheckProductConfigurationEvent('StateChange', configuration);
    
    res.json(configuration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /checkProductConfiguration/:id - Delete CheckProductConfiguration
router.delete('/:id', async (req, res) => {
  try {
    const configuration = await CheckProductConfiguration.findOneAndDelete({ id: req.params.id });
    
    if (!configuration) {
      return res.status(404).json({ error: 'CheckProductConfiguration not found' });
    }
    
    // Emit delete event
    eventService.emitCheckProductConfigurationEvent('Delete', configuration);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;