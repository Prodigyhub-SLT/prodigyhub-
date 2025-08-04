// models/CheckProductConfiguration.js
// FINAL FIX: Add productConfigurationSpecification field to MongoDB schema
const mongoose = require('mongoose');

const ConfigurationCharacteristicValueSchema = new mongoose.Schema({
  '@type': { type: String, default: 'ConfigurationCharacteristicValue' },
  isSelectable: { type: Boolean, default: true },
  isSelected: { type: Boolean, default: false },
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
    name: String,
    itemId: String,
    entityId: String,
    entityHref: String,
    '@type': { type: String, default: 'ItemRef' },
    '@referredType': String
  },
  productConfiguration: ProductConfigurationSchema,
  // 🔧 CRITICAL FIX: Add productConfigurationSpecification field
  productConfigurationSpecification: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
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
  id: { type: String, unique: true },
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'done', 'failed'], 
    default: 'acknowledged' 
  },
  instantSync: { type: Boolean, default: false },
  provideAlternatives: { type: Boolean, default: false },
  
  // 🔧 CRITICAL FIX: Add the missing productConfigurationSpecification field at top level
  productConfigurationSpecification: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
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
  checkProductConfigurationItem: [CheckProductConfigurationItemSchema],
  
  // Additional fields
  requestedDate: { type: Date, default: Date.now }
}, {
  timestamps: true,
  // 🔧 IMPORTANT: Allow additional fields to be saved and disable strict mode
  strict: false
});

// Generate unique ID before saving
CheckProductConfigurationSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  if (!this.href) {
    this.href = `https://localhost:5000/tmf-api/productConfiguration/v5/CheckProductConfiguration/${this.id}`;
  }
  next();
});

module.exports = mongoose.model('CheckProductConfiguration', CheckProductConfigurationSchema);