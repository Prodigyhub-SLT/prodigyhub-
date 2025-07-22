// backend/routes/queryProductConfiguration.js
const express = require('express');
const router = express.Router();
const QueryProductConfiguration = require('../models/QueryProductConfiguration');
const { validateQueryProductConfiguration } = require('../middleware/validation');

// GET /queryProductConfiguration - List or find QueryProductConfiguration objects
router.get('/', async (req, res) => {
  try {
    const { fields, limit = 10, offset = 0, ...filters } = req.query;
    
    let query = QueryProductConfiguration.find(filters);
    
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

// GET /queryProductConfiguration/:id - Retrieve QueryProductConfiguration by ID
router.get('/:id', async (req, res) => {
  try {
    const { fields } = req.query;
    let query = QueryProductConfiguration.findOne({ id: req.params.id });
    
    if (fields) {
      const fieldList = fields.split(',').join(' ');
      query = query.select(fieldList);
    }
    
    const configuration = await query;
    
    if (!configuration) {
      return res.status(404).json({ error: 'QueryProductConfiguration not found' });
    }
    
    res.json(configuration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /queryProductConfiguration - Create QueryProductConfiguration
router.post('/', validateQueryProductConfiguration, async (req, res) => {
  try {
    const configData = {
      ...req.body,
      '@type': 'QueryProductConfiguration'
    };

    // Process and compute configuration if instantSync
    if (configData.instantSync) {
      configData.state = 'done';
      
      // Generate computed configuration items based on request items
      configData.computedProductConfigurationItem = configData.requestProductConfigurationItem.map((requestItem, index) => {
        const computedId = (parseInt(requestItem.id) + 1).toString().padStart(2, '0');
        
        return {
          '@type': 'QueryProductConfigurationItem',
          id: computedId,
          state: 'approved',
          productConfigurationItemRelationship: [{
            '@type': 'ProductConfigurationItemRelationship',
            id: requestItem.id,
            relationshipType: 'requestItem'
          }],
          productConfiguration: {
            '@type': 'ProductConfiguration',
            id: computedId,
            isSelectable: false,
            isSelected: true,
            isVisible: true,
            productOffering: requestItem.productConfiguration?.productOffering,
            configurationAction: requestItem.productConfiguration?.configurationAction || [{
              '@type': 'ConfigurationAction',
              action: 'add',
              description: 'Add new product',
              isSelected: true
            }],
            configurationTerm: [{
              '@type': 'ConfigurationTerm',
              name: '12 month contract',
              isSelectable: true,
              isSelected: false
            }, {
              '@type': 'ConfigurationTerm',
              name: '24 month contract',
              isSelectable: true,
              isSelected: false
            }],
            configurationCharacteristic: [{
              '@type': 'ConfigurationCharacteristic',
              id: '77',
              name: 'Color',
              valueType: 'string',
              minCardinality: 1,
              maxCardinality: 1,
              isConfigurable: true,
              configurationCharacteristicValue: [{
                '@type': 'ConfigurationCharacteristicValue',
                isSelectable: true,
                isSelected: true,
                characteristicValue: {
                  name: 'Color',
                  value: 'Blue',
                  '@type': 'StringCharacteristic'
                }
              }, {
                '@type': 'ConfigurationCharacteristicValue',
                isSelectable: true,
                isSelected: false,
                characteristicValue: {
                  name: 'Color',
                  value: 'Red',
                  '@type': 'StringCharacteristic'
                }
              }]
            }],
            configurationPrice: [{
              '@type': 'ConfigurationPrice',
              name: 'Product price',
              priceType: 'oneTimeCharge',
              productOfferingPrice: {
                id: '1747',
                href: 'https://host:port/tmf-api/productCatalogManagement/v5/productOfferingPrice/1747',
                name: 'One time charge',
                '@referredType': 'ProductOfferingPrice',
                '@type': 'ProductOfferingPrice'
              },
              price: {
                taxRate: 22,
                '@type': 'Price',
                dutyFreeAmount: {
                  unit: 'USD',
                  value: 100,
                  '@type': 'Money'
                },
                taxIncludedAmount: {
                  unit: 'USD',
                  value: 122,
                  '@type': 'Money'
                }
              }
            }]
          }
        };
      });
    }

    const configuration = new QueryProductConfiguration(configData);
    await configuration.save();
    
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

// DELETE /queryProductConfiguration/:id - Delete QueryProductConfiguration
router.delete('/:id', async (req, res) => {
  try {
    const configuration = await QueryProductConfiguration.findOneAndDelete({ id: req.params.id });
    
    if (!configuration) {
      return res.status(404).json({ error: 'QueryProductConfiguration not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;