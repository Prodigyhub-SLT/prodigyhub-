// src/api/tmf760/app.js - TMF760 Product Configuration Management API
const express = require('express');
const router = express.Router();

const BASE_URL = 'http://localhost:3000/tmf-api/productConfigurationManagement/v5';

// ===================================
// VALIDATION MIDDLEWARES
// ===================================

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
router.get('/checkProductConfiguration', async (req, res) => {
  try {
    const sampleConfigs = [
      {
        '@type': 'CheckProductConfiguration',
        id: 'check_001',
        href: `${BASE_URL}/checkProductConfiguration/check_001`,
        state: 'done',
        instantSync: true,
        provideAlternatives: false,
        channel: {
          id: '4407',
          href: 'https://host:port/tmf-api/salesChannelManagement/v5/channel/4407',
          name: 'Assisted Channel',
          '@referredType': 'SalesChannel',
          '@type': 'ChannelRef'
        },
        checkProductConfigurationItem: []
      },
      {
        '@type': 'CheckProductConfiguration',
        id: 'check_002',
        href: `${BASE_URL}/checkProductConfiguration/check_002`,
        state: 'inProgress',
        instantSync: false,
        provideAlternatives: false,
        checkProductConfigurationItem: []
      }
    ];

    res.json(sampleConfigs);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Retrieve CheckProductConfiguration by ID
router.get('/checkProductConfiguration/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sampleConfig = {
      '@type': 'CheckProductConfiguration',
      id: id,
      href: `${BASE_URL}/checkProductConfiguration/${id}`,
      state: 'done',
      instantSync: true,
      provideAlternatives: false,
      channel: {
        id: '4407',
        href: 'https://host:port/tmf-api/salesChannelManagement/v5/channel/4407',
        name: 'Assisted Channel',
        '@referredType': 'SalesChannel',
        '@type': 'ChannelRef'
      },
      relatedParty: [{
        role: 'prospect',
        '@type': 'RelatedPartyRefOrPartyRoleRef',
        partyOrPartyRole: {
          '@type': 'PartyRef',
          id: '456',
          href: 'https://host:port/partyManagement/v5/party/456',
          name: 'Ross',
          '@referredType': 'Individual'
        }
      }],
      contextEntity: {
        id: '3472',
        href: 'https://host:port/quoteManagement/v5/quote/3472',
        name: 'March 2019 Order',
        '@type': 'EntityRef',
        '@referredType': 'Quote'
      },
      contextCharacteristic: [{
        name: 'salesModel',
        valueType: 'string',
        value: 'B2C',
        '@type': 'StringCharacteristic'
      }],
      checkProductConfigurationItem: [{
        '@type': 'CheckProductConfigurationItem',
        id: '01',
        contextItem: {
          '@type': 'ItemRef',
          id: '01',
          itemId: '01',
          entityId: '3472',
          entityHref: 'https://host:port/quoteManagement/v5/quote/3472',
          name: 'Quote item 01',
          '@referredType': 'QuoteItem'
        },
        productConfiguration: {
          '@type': 'ProductConfiguration',
          productOffering: {
            id: '14305',
            href: 'https://host:port/productCatalogManagement/v5/productOffering/14305',
            name: 'Mobile Handset',
            '@type': 'ProductOfferingRef'
          },
          configurationCharacteristic: [{
            '@type': 'ConfigurationCharacteristic',
            id: '77',
            name: 'Color',
            valueType: 'string',
            minCardinality: 1,
            maxCardinality: 1,
            isConfigurable: true,
            isVisible: true,
            configurationCharacteristicValue: [{
              '@type': 'ConfigurationCharacteristicValue',
              isSelectable: true,
              isSelected: true,
              isVisible: true,
              characteristicValue: {
                name: 'Color',
                value: 'Blue',
                '@type': 'StringCharacteristic'
              }
            }]
          }]
        },
        state: 'approved',
        stateReason: []
      }]
    };

    res.json(sampleConfig);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Create check configuration
router.post('/checkProductConfiguration', validateCheckConfig, async (req, res) => {
  try {
    const configData = {
      ...req.body,
      '@type': 'CheckProductConfiguration',
      id: req.body.id || `check_${Date.now()}`,
      href: `${BASE_URL}/checkProductConfiguration/${req.body.id || `check_${Date.now()}`}`
    };

    if (configData.instantSync) {
      configData.state = 'done';

      configData.checkProductConfigurationItem = configData.checkProductConfigurationItem.map(item => {
        let isValid = true;
        let stateReasons = [];

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
          '@type': 'CheckProductConfigurationItem',
          id: item.id,
          contextItem: {
            '@type': 'ItemRef',
            id: item.contextItem?.id || item.id,
            itemId: item.contextItem?.itemId || item.id,
            entityId: item.contextItem?.entityId || '3472',
            entityHref: item.contextItem?.entityHref || 'https://host:port/quoteManagement/v5/quote/3472',
            name: item.contextItem?.name || `Quote item ${item.id}`,
            '@referredType': item.contextItem?.['@referredType'] || 'QuoteItem'
          },
          productConfiguration: item.productConfiguration,
          state: isValid ? 'approved' : 'rejected',
          stateReason: stateReasons
        };
      });
    } else {
      configData.state = 'acknowledged';
      configData.checkProductConfigurationItem = configData.checkProductConfigurationItem.map(item => ({
        ...item,
        stateReason: []
      }));
    }

    res.status(201).json(configData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete check configuration
router.delete('/checkProductConfiguration/:id', async (req, res) => {
  try {
    res.status(204).send();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================================
// QUERY PRODUCT CONFIGURATION ROUTES
// ===================================

// Reuse your existing GET, POST, DELETE for queryProductConfiguration as-is...
// (You can paste them in the same structure as above)

// Export the router
module.exports = router;
