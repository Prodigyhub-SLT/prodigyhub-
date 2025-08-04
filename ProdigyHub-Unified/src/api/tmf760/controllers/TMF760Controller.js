// ===================================================================
// Path: controllers/TMF760Controller.js
// FINAL FIX: Enhanced TMF760 Controller with productConfigurationSpecification support
// ===================================================================

// --- Normalization Helper ---
function normalizeProductConfiguration(config) {
  // Default fields you want to always show
  const defaultFields = {
    connectionType: undefined,
    packageType: undefined,
    speedTier: undefined,
    contractTerm: undefined,
    staticIP: undefined,
    entertainmentAddons: [],
    // Add more fields as needed
  };

  // Try to extract from configurationCharacteristic
  if (
    config.checkProductConfigurationItem &&
    config.checkProductConfigurationItem[0] &&
    config.checkProductConfigurationItem[0].productConfiguration &&
    Array.isArray(config.checkProductConfigurationItem[0].productConfiguration.configurationCharacteristic)
  ) {
    for (const char of config.checkProductConfigurationItem[0].productConfiguration.configurationCharacteristic) {
      if (char.name && char.value !== undefined) {
        defaultFields[char.name] = char.value;
      }
    }
  }

  // Merge with the config for output
  return { ...config, ...defaultFields };
}

const CheckProductConfiguration = require('../models/CheckProductConfiguration');
const QueryProductConfiguration = require('../models/QueryProductConfiguration');
const { v4: uuidv4 } = require('uuid');

class TMF760Controller {
  // ===================================
  // CHECK PRODUCT CONFIGURATION
  // ===================================

  async createCheckConfiguration(req, res) {
    try {
      console.log('🔧 Creating configuration with body:', JSON.stringify(req.body, null, 2));
      
      const configData = {
        ...req.body,
        '@type': 'CheckProductConfiguration'
      };

      // Set ID if not provided
      if (!configData.id) {
        configData.id = `check_${Date.now()}`;
      }

      // 🔧 CRITICAL FIX: Explicitly preserve productConfigurationSpecification
      if (req.body.productConfigurationSpecification) {
        configData.productConfigurationSpecification = req.body.productConfigurationSpecification;
        console.log('✅ Preserved top-level productConfigurationSpecification');
      }

      // Process configuration if instantSync
      if (configData.instantSync) {
        configData.state = 'done';
        
        configData.checkProductConfigurationItem = configData.checkProductConfigurationItem.map(item => {
          let isValid = true;
          let stateReasons = [];

          // 🔧 CRITICAL: Also preserve productConfigurationSpecification in items
          if (req.body.productConfigurationSpecification) {
            item.productConfigurationSpecification = req.body.productConfigurationSpecification;
          }

          // Validate configuration
          if (item.productConfiguration?.configurationCharacteristic) {
            for (const char of item.productConfiguration.configurationCharacteristic) {
              if (char.minCardinality > 0) {
                const selectedValues = char.configurationCharacteristicValue?.filter(val => val.isSelected) || [];
                if (selectedValues.length < char.minCardinality) {
                  isValid = false;
                  stateReasons.push({
                    code: '123',
                    label: `Missing required characteristic: ${char.name}`,
                    '@type': 'StateReason'
                  });
                }
              }
            }
          }

          return {
            ...item,
            '@type': 'CheckProductConfigurationItem',
            contextItem: {
              '@type': 'ItemRef',
              id: item.contextItem?.id || item.id,
              itemId: item.contextItem?.itemId || item.id,
              entityId: item.contextItem?.entityId || '3472',
              entityHref: item.contextItem?.entityHref || `${process.env.BASE_URL || 'http://localhost:3000'}/quote/3472`,
              name: item.contextItem?.name || `Quote item ${item.id}`,
              '@referredType': item.contextItem?.['@referredType'] || 'QuoteItem'
            },
            state: isValid ? 'approved' : 'rejected',
            stateReason: stateReasons
          };
        });
      } else {
        configData.state = 'acknowledged';
        configData.checkProductConfigurationItem = configData.checkProductConfigurationItem.map(item => {
          // 🔧 CRITICAL: Preserve productConfigurationSpecification in items
          if (req.body.productConfigurationSpecification) {
            item.productConfigurationSpecification = req.body.productConfigurationSpecification;
          }
          
          return {
            ...item,
            '@type': 'CheckProductConfigurationItem',
            stateReason: []
          };
        });
      }

      console.log('🔧 Final configData before save:', {
        id: configData.id,
        hasTopLevelSpec: !!configData.productConfigurationSpecification,
        hasItemSpec: !!configData.checkProductConfigurationItem?.[0]?.productConfigurationSpecification
      });

      const configuration = new CheckProductConfiguration(configData);
      const savedConfig = await configuration.save();
      
      console.log('✅ Configuration saved successfully:', {
        id: savedConfig.id,
        hasTopLevelSpec: !!savedConfig.productConfigurationSpecification,
        hasItemSpec: !!savedConfig.checkProductConfigurationItem?.[0]?.productConfigurationSpecification
      });
      
      const statusCode = configData.instantSync ? 200 : 201;
      res.status(statusCode).json(savedConfig);
      
    } catch (error) {
      console.error('❌ Error creating check configuration:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid configuration data',
          details: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  async getCheckConfigurations(req, res) {
    try {
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      let query = CheckProductConfiguration.find(filters);

      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href productConfigurationSpecification`);
      }

      const configurations = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });

      // Normalize each config before sending
      const normalizedConfigs = configurations.map(config => {
        const plain = config.toObject ? config.toObject() : config;
        return normalizeProductConfiguration(plain);
      });

      // Get total count for pagination headers
      const total = await CheckProductConfiguration.countDocuments(filters);
      res.set('X-Total-Count', total.toString());
      res.set('X-Result-Count', normalizedConfigs.length.toString());

      res.json(normalizedConfigs);
    } catch (error) {
      console.error('❌ Error getting check configurations:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  async getCheckConfigurationById(req, res) {
    try {
      const { id } = req.params;
      const { fields } = req.query;

      let query = CheckProductConfiguration.findOne({ id });

      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href productConfigurationSpecification`);
      }

      const configuration = await query;

      if (!configuration) {
        return res.status(404).json({
          error: 'Not Found',
          message: `CheckProductConfiguration with id ${id} not found`
        });
      }

      const plain = configuration.toObject ? configuration.toObject() : configuration;
      const normalizedConfig = normalizeProductConfiguration(plain);

      res.json(normalizedConfig);

    } catch (error) {
      console.error('❌ Error getting check configuration by ID:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  async deleteCheckConfiguration(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🗑️ Deleting configuration with ID:', id);
      
      const configuration = await CheckProductConfiguration.findOneAndDelete({ id });
      
      if (!configuration) {
        return res.status(404).json({
          error: 'Not Found',
          message: `CheckProductConfiguration with id ${id} not found`
        });
      }
      
      console.log('✅ Configuration deleted successfully:', id);
      
      res.status(204).send();
      
    } catch (error) {
      console.error('❌ Error deleting check configuration:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ===================================
  // QUERY PRODUCT CONFIGURATION  
  // ===================================

  async createQueryConfiguration(req, res) {
    try {
      const configData = {
        ...req.body,
        '@type': 'QueryProductConfiguration'
      };

      // Set ID if not provided
      if (!configData.id) {
        configData.id = `query_${Date.now()}`;
      }

      // 🔧 CRITICAL FIX: Preserve productConfigurationSpecification for query configs too
      if (req.body.productConfigurationSpecification) {
        configData.productConfigurationSpecification = req.body.productConfigurationSpecification;
      }

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
                  href: `${process.env.BASE_URL || 'http://localhost:3000'}/productOfferingPrice/1747`,
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
      console.error('❌ Error creating query configuration:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid configuration data',
          details: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  async getQueryConfigurations(req, res) {
    try {
      const { fields, limit = 20, offset = 0, ...filters } = req.query;
      
      let query = QueryProductConfiguration.find(filters);
      
      // 🔧 CRITICAL FIX: Always include productConfigurationSpecification
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href productConfigurationSpecification`);
      }
      
      const configurations = await query
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ createdAt: -1 });
      
      const total = await QueryProductConfiguration.countDocuments(filters);
      
      res.set('X-Total-Count', total.toString());
      res.set('X-Result-Count', configurations.length.toString());
      
      res.json(configurations);
      
    } catch (error) {
      console.error('❌ Error getting query configurations:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  async getQueryConfigurationById(req, res) {
    try {
      const { id } = req.params;
      const { fields } = req.query;
      
      let query = QueryProductConfiguration.findOne({ id });
      
      // 🔧 CRITICAL FIX: Always include productConfigurationSpecification
      if (fields) {
        const fieldList = fields.split(',').map(f => f.trim()).join(' ');
        query = query.select(`${fieldList} @type id href productConfigurationSpecification`);
      }
      
      const configuration = await query;
      
      if (!configuration) {
        return res.status(404).json({
          error: 'Not Found',
          message: `QueryProductConfiguration with id ${id} not found`
        });
      }
      
      res.json(configuration);
      
    } catch (error) {
      console.error('❌ Error getting query configuration by ID:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  async deleteQueryConfiguration(req, res) {
    try {
      const { id } = req.params;
      
      const configuration = await QueryProductConfiguration.findOneAndDelete({ id });
      
      if (!configuration) {
        return res.status(404).json({
          error: 'Not Found',
          message: `QueryProductConfiguration with id ${id} not found`
        });
      }
      
      res.status(204).send();
      
    } catch (error) {
      console.error('❌ Error deleting query configuration:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

module.exports = new TMF760Controller();