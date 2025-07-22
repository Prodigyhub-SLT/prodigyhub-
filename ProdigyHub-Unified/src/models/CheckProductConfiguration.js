// ===================================================================
// Path: models/CheckProductConfiguration.js
// Updated with MongoDB Schema
// ===================================================================

const mongoose = require('mongoose');

const ConfigurationCharacteristicValueSchema = new mongoose.Schema({
  '@type': { type: String, default: 'ConfigurationCharacteristicValue' },
  isSelectable: { type: Boolean, default: true },
  isSelected: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  characteristicValue: {
    name: String,
    value: mongoose.Schema.Types.Mixed,
    '@type': String
  }
});

const ConfigurationCharacteristicSchema = new mongoose.Schema({
  '@type': { type: String, default: 'ConfigurationCharacteristic' },
  id: String,
  name: String,
  valueType: String,
  minCardinality: Number,
  maxCardinality: Number,
  isConfigurable: { type: Boolean, default: true },
  isVisible: { type: Boolean, default: true },
  configurationCharacteristicValue: [ConfigurationCharacteristicValueSchema]
});

const ConfigurationPriceSchema = new mongoose.Schema({
  '@type': { type: String, default: 'ConfigurationPrice' },
  name: String,
  priceType: String,
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
});

const ProductConfigurationSchema = new mongoose.Schema({
  '@type': { type: String, default: 'ProductConfiguration' },
  productOffering: {
    id: String,
    href: String,
    name: String,
    '@type': { type: String, default: 'ProductOfferingRef' }
  },
  configurationCharacteristic: [ConfigurationCharacteristicSchema],
  configurationPrice: [ConfigurationPriceSchema],
  product: {
    '@type': { type: String, default: 'Product' },
    productCharacteristic: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      '@type': String
    }]
  }
});

const CheckProductConfigurationItemSchema = new mongoose.Schema({
  '@type': { type: String, default: 'CheckProductConfigurationItem' },
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
  productConfiguration: ProductConfigurationSchema,
  alternateProductConfigurationProposal: [ProductConfigurationSchema],
  stateReason: [{
    code: String,
    label: String,
    '@type': { type: String, default: 'StateReason' }
  }]
});

const CheckProductConfigurationSchema = new mongoose.Schema({
  '@type': { type: String, default: 'CheckProductConfiguration' },
  href: String,
  id: { type: String, unique: true, required: true },
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'done', 'failed'], 
    default: 'acknowledged' 
  },
  instantSync: { type: Boolean, default: false },
  provideAlternatives: { type: Boolean, default: false },
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
  checkProductConfigurationItem: [CheckProductConfigurationItemSchema]
}, {
  timestamps: true,
  collection: 'checkproductconfigurations'
});

// Generate unique ID and href before saving
CheckProductConfigurationSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  if (!this.href) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.href = `${baseUrl}/tmf-api/productConfigurationManagement/v5/checkProductConfiguration/${this.id}`;
  }
  next();
});

// Add indexes for better performance
CheckProductConfigurationSchema.index({ id: 1 });
CheckProductConfigurationSchema.index({ state: 1 });
CheckProductConfigurationSchema.index({ instantSync: 1 });
CheckProductConfigurationSchema.index({ 'checkProductConfigurationItem.state': 1 });
CheckProductConfigurationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CheckProductConfiguration', CheckProductConfigurationSchema);