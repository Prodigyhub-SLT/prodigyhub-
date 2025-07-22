// ===================================================================
// Path: models/QueryProductConfiguration.js
// Updated with MongoDB Schema
// ===================================================================

const mongoose = require('mongoose');

const QueryProductConfigurationItemSchema = new mongoose.Schema({
  '@type': { type: String, default: 'QueryProductConfigurationItem' },
  id: { type: String, required: true },
  state: { type: String, enum: ['approved', 'rejected'], default: 'approved' },
  contextItem: {
    '@type': { type: String, default: 'ItemRef' },
    id: String,
    itemId: String,
    entityId: String,
    entityHref: String,
    name: String,
    '@referredType': String
  },
  productConfiguration: {
    '@type': { type: String, default: 'ProductConfiguration' },
    id: String,
    isSelectable: { type: Boolean, default: true },
    isSelected: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    productOffering: {
      id: String,
      href: String,
      name: String,
      '@type': { type: String, default: 'ProductOfferingRef' }
    },
    configurationAction: [{
      '@type': { type: String, default: 'ConfigurationAction' },
      action: String,
      description: String,
      isSelected: Boolean
    }],
    configurationTerm: [{
      '@type': { type: String, default: 'ConfigurationTerm' },
      name: String,
      isSelectable: Boolean,
      isSelected: Boolean
    }],
    configurationCharacteristic: [{
      '@type': { type: String, default: 'ConfigurationCharacteristic' },
      id: String,
      name: String,
      valueType: String,
      minCardinality: Number,
      maxCardinality: Number,
      isConfigurable: Boolean,
      configurationCharacteristicValue: [{
        '@type': { type: String, default: 'ConfigurationCharacteristicValue' },
        isSelectable: Boolean,
        isSelected: Boolean,
        characteristicValue: {
          name: String,
          value: mongoose.Schema.Types.Mixed,
          '@type': String
        }
      }]
    }],
    configurationPrice: [{
      '@type': { type: String, default: 'ConfigurationPrice' },
      name: String,
      priceType: String,
      productOfferingPrice: {
        id: String,
        href: String,
        name: String,
        '@referredType': String,
        '@type': { type: String, default: 'ProductOfferingPrice' }
      },
      price: {
        taxRate: Number,
        '@type': { type: String, default: 'Price' },
        dutyFreeAmount: {
          unit: String,
          value: Number,
          '@type': { type: String, default: 'Money' }
        },
        taxIncludedAmount: {
          unit: String,
          value: Number,
          '@type': { type: String, default: 'Money' }
        }
      }
    }]
  },
  productConfigurationItemRelationship: [{
    '@type': { type: String, default: 'ProductConfigurationItemRelationship' },
    id: String,
    relationshipType: String
  }]
});

const QueryProductConfigurationSchema = new mongoose.Schema({
  '@type': { type: String, default: 'QueryProductConfiguration' },
  href: String,
  id: { type: String, unique: true, required: true },
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'done', 'failed'], 
    default: 'acknowledged' 
  },
  instantSync: { type: Boolean, default: false },
  channel: {
    id: String,
    href: String,
    name: String,
    '@referredType': String,
    '@type': { type: String, default: 'ChannelRef' }
  },
  relatedParty: [{
    role: String,
    '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' },
    partyOrPartyRole: {
      '@type': String,
      id: String,
      href: String,
      name: String,
      '@referredType': String
    }
  }],
  contextEntity: {
    id: String,
    href: String,
    name: String,
    '@type': { type: String, default: 'EntityRef' },
    '@referredType': String
  },
  contextCharacteristic: [{
    name: String,
    valueType: String,
    value: mongoose.Schema.Types.Mixed,
    '@type': String
  }],
  requestProductConfigurationItem: [QueryProductConfigurationItemSchema],
  computedProductConfigurationItem: [QueryProductConfigurationItemSchema]
}, {
  timestamps: true,
  collection: 'queryproductconfigurations'
});

// Generate unique ID and href before saving
QueryProductConfigurationSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  if (!this.href) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.href = `${baseUrl}/tmf-api/productConfigurationManagement/v5/queryProductConfiguration/${this.id}`;
  }
  next();
});

// Add indexes for better performance
QueryProductConfigurationSchema.index({ id: 1 });
QueryProductConfigurationSchema.index({ state: 1 });
QueryProductConfigurationSchema.index({ instantSync: 1 });
QueryProductConfigurationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QueryProductConfiguration', QueryProductConfigurationSchema);