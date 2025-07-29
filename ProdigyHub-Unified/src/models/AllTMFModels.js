// src/models/AllTMFModels.js - Unified MongoDB Models for All TMF APIs
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ===================================
// TMF620 - PRODUCT CATALOG MODELS
// ===================================

const CategorySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  description: String,
  version: { type: String, default: '1.0' },
  isRoot: { type: Boolean, default: false },
  lifecycleStatus: { type: String, default: 'Active' },
  validFor: {
    startDateTime: Date,
    endDateTime: Date
  },
  lastUpdate: { type: Date, default: Date.now },
  parentId: String,
  subCategory: [String],
  '@type': { type: String, default: 'Category' }
}, {
  timestamps: true,
  collection: 'categories'
});

const ProductSpecificationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  description: String,
  brand: String,
  productNumber: String,
  version: { type: String, default: '1.0' },
  isBundle: { type: Boolean, default: false },
  lifecycleStatus: { type: String, default: 'Active' },
  validFor: {
    startDateTime: Date,
    endDateTime: Date
  },
  lastUpdate: { type: Date, default: Date.now },
  attachment: [{
    id: String,
    href: String,
    mimeType: String,
    '@type': { type: String, default: 'AttachmentRefOrValue' }
  }],
  relatedParty: [{
    id: String,
    name: String,
    role: String,
    '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' }
  }],
  productSpecCharacteristic: [{
    name: String,
    valueType: String,
    '@type': { type: String, default: 'CharacteristicSpecification' }
  }],
  targetProductSchema: {
    '@type': { type: String, default: 'ProductSpecification' }
  },
  '@type': { type: String, default: 'ProductSpecification' }
}, {
  timestamps: true,
  collection: 'productspecifications'
});

const ProductOfferingSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  description: String,
  version: { type: String, default: '1.0' },
  isBundle: { type: Boolean, default: false },
  isSellable: { type: Boolean, default: true },
  lifecycleStatus: { type: String, default: 'Active' },
  statusReason: String,
  validFor: {
    startDateTime: Date,
    endDateTime: Date
  },
  lastUpdate: { type: Date, default: Date.now },
  category: [{
    id: String,
    name: String,
    '@type': { type: String, default: 'CategoryRef' }
  }],
  productOfferingPrice: [{
    id: String,
    name: String,
    '@type': { type: String, default: 'ProductOfferingPriceRef' }
  }],
  productSpecification: {
    id: String,
    name: String,
    '@type': { type: String, default: 'ProductSpecificationRef' }
  },
  '@type': { type: String, default: 'ProductOffering' }
}, {
  strict: false,
  timestamps: true,
  collection: 'productofferings'
});

const ProductOfferingPriceSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  description: String,
  version: { type: String, default: '1.0' },
  isBundle: { type: Boolean, default: false },
  lifecycleStatus: { type: String, default: 'Active' },
  priceType: String,
  price: {
    unit: String,
    value: Number
  },
  percentage: Number,
  validFor: {
    startDateTime: Date,
    endDateTime: Date
  },
  lastUpdate: { type: Date, default: Date.now },
  '@type': { type: String, default: 'ProductOfferingPrice' }
}, {
  timestamps: true,
  collection: 'productofferingprices'
});

const ProductCatalogSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  description: String,
  catalogType: { type: String, default: 'ProductCatalog' },
  version: { type: String, default: '1.0' },
  lifecycleStatus: { type: String, default: 'Active' },
  validFor: {
    startDateTime: Date,
    endDateTime: Date
  },
  lastUpdate: { type: Date, default: Date.now },
  category: [{
    id: String,
    name: String,
    '@type': { type: String, default: 'CategoryRef' }
  }],
  relatedParty: [{
    id: String,
    name: String,
    role: String,
    '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' }
  }],
  '@type': { type: String, default: 'Catalog' }
}, {
  timestamps: true,
  collection: 'productcatalogs'
});

// ===================================
// TMF637 - PRODUCT INVENTORY MODELS
// ===================================

const ProductSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  description: String,
  status: { 
    type: String, 
    enum: ['created', 'pendingActive', 'cancelled', 'active', 'pendingTerminate', 'terminated', 'suspended', 'aborted'],
    default: 'created' 
  },
  creationDate: { type: Date, default: Date.now },
  lastUpdate: { type: Date, default: Date.now },
  startDate: Date,
  terminationDate: String, // Keep as String for compatibility
  isBundle: { type: Boolean, default: false },
  isCustomerVisible: { type: Boolean, default: true },
  productSerialNumber: { type: String, default: '' },
  relatedParty: [{
    id: String,
    name: String,
    role: String,
    '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' }
  }],
  productCharacteristic: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    '@type': String
  }],
  productPrice: [mongoose.Schema.Types.Mixed],
  productRelationship: [mongoose.Schema.Types.Mixed],
  place: [mongoose.Schema.Types.Mixed],
  productOrderItem: [mongoose.Schema.Types.Mixed],
  realizingResource: [mongoose.Schema.Types.Mixed],
  realizingService: [mongoose.Schema.Types.Mixed],
  agreementItem: [mongoose.Schema.Types.Mixed],
  productSpecification: {
    id: String,
    href: String,
    name: String,
    version: String,
    '@type': { type: String, default: 'ProductSpecificationRef' }
  },
  billingAccount: {
    id: String,
    href: String,
    name: String,
    '@type': { type: String, default: 'BillingAccountRef' }
  },
  productOffering: {
    id: String,
    href: String,
    name: String,
    '@type': { type: String, default: 'ProductOfferingRef' }
  },
  '@type': { type: String, default: 'Product' },
  '@baseType': { type: String, default: 'BaseProduct' },
  '@schemaLocation': { type: String, default: 'http://example.com/schema/Product' }
}, {
  timestamps: true,
  collection: 'products'
});

// ===================================
// TMF679 - PRODUCT OFFERING QUALIFICATION MODELS
// ===================================

const CheckProductOfferingQualificationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  creationDate: { type: Date, default: Date.now },
  description: String,
  effectiveQualificationDate: Date,
  expectedQualificationCompletionDate: Date,
  expirationDate: Date,
  instantSyncQualification: { type: Boolean, default: false },
  provideAlternative: { type: Boolean, default: false },
  provideOnlyAvailable: { type: Boolean, default: false },
  provideResultReason: { type: Boolean, default: false },
  qualificationResult: String,
  requestedQualificationCompletionDate: Date,
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'rejected', 'terminatedWithError', 'cancelled', 'done'],
    default: 'acknowledged' 
  },
  channel: {
    id: String,
    name: String,
    '@type': { type: String, default: 'ChannelRef' }
  },
  checkProductOfferingQualificationItem: [mongoose.Schema.Types.Mixed],
  note: [{
    id: String,
    text: String,
    author: String,
    date: { type: Date, default: Date.now },
    '@type': { type: String, default: 'Note' }
  }],
  relatedParty: [{
    id: String,
    name: String,
    role: String,
    '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' }
  }],
  '@baseType': { type: String, default: 'CheckProductOfferingQualification' },
  '@type': { type: String, default: 'CheckProductOfferingQualification' },
  '@schemaLocation': String
}, {
  timestamps: true,
  collection: 'checkproductofferingqualifications'
});

const QueryProductOfferingQualificationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  creationDate: { type: Date, default: Date.now },
  description: String,
  effectiveQualificationDate: Date,
  expectedQualificationCompletionDate: Date,
  expirationDate: Date,
  instantSyncQualification: { type: Boolean, default: false },
  requestedQualificationCompletionDate: Date,
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'rejected', 'terminatedWithError', 'cancelled', 'done'],
    default: 'acknowledged' 
  },
  channel: {
    id: String,
    name: String,
    '@type': { type: String, default: 'ChannelRef' }
  },
  note: [{
    id: String,
    text: String,
    author: String,
    date: { type: Date, default: Date.now },
    '@type': { type: String, default: 'Note' }
  }],
  qualifiedProductOfferingItem: [mongoose.Schema.Types.Mixed],
  relatedParty: [{
    id: String,
    name: String,
    role: String,
    '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' }
  }],
  searchCriteria: {
    '@type': { type: String, default: 'SearchCriteria' }
  },
  '@baseType': { type: String, default: 'QueryProductOfferingQualification' },
  '@type': { type: String, default: 'QueryProductOfferingQualification' },
  '@schemaLocation': String
}, {
  timestamps: true,
  collection: 'queryproductofferingqualifications'
});

// ===================================
// TMF622 - PRODUCT ORDERING MODELS
// ===================================

const ProductOrderSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  creationDate: { type: Date, default: Date.now },
  completionDate: Date,
  expectedCompletionDate: Date,
  requestedCompletionDate: Date,
  requestedStartDate: Date,
  cancellationDate: Date,
  orderDate: { type: Date, default: Date.now },
  category: { type: String, default: 'B2C product order' },
  description: String,
  cancellationReason: String,
  notificationContact: String,
  priority: { 
    type: String, 
    enum: ['0', '1', '2', '3', '4'],
    default: '4' 
  },
  state: { 
    type: String, 
    enum: [
      'acknowledged', 'rejected', 'pending', 'held', 'inProgress', 
      'cancelled', 'completed', 'failed', 'partial', 'assessingCancellation', 
      'pendingCancellation'
    ],
    default: 'acknowledged'
  },
  externalId: [mongoose.Schema.Types.Mixed],
  channel: [mongoose.Schema.Types.Mixed],
  note: [{
    id: String,
    text: String,
    author: String,
    date: { type: Date, default: Date.now },
    '@type': { type: String, default: 'Note' }
  }],
  productOrderItem: [{
    id: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    action: { 
      type: String, 
      enum: ['add', 'modify', 'delete', 'noChange'],
      default: 'add' 
    },
    state: { type: String, default: 'acknowledged' },
    appointment: mongoose.Schema.Types.Mixed,
    billingAccount: mongoose.Schema.Types.Mixed,
    product: mongoose.Schema.Types.Mixed,
    productOffering: mongoose.Schema.Types.Mixed,
    productOfferingQualificationItem: mongoose.Schema.Types.Mixed,
    productOrderItemRelationship: [mongoose.Schema.Types.Mixed],
    itemPrice: [mongoose.Schema.Types.Mixed],
    itemTotalPrice: mongoose.Schema.Types.Mixed,
    itemTerm: [mongoose.Schema.Types.Mixed],
    note: [mongoose.Schema.Types.Mixed],
    payment: [mongoose.Schema.Types.Mixed],
    qualification: mongoose.Schema.Types.Mixed,
    quoteItem: mongoose.Schema.Types.Mixed,
    '@type': { type: String, default: 'ProductOrderItem' }
  }],
  relatedParty: [mongoose.Schema.Types.Mixed],
  orderTotalPrice: mongoose.Schema.Types.Mixed,
  payment: [mongoose.Schema.Types.Mixed],
  billingAccount: mongoose.Schema.Types.Mixed,
  agreement: mongoose.Schema.Types.Mixed,
  quote: mongoose.Schema.Types.Mixed,
  productOfferingQualification: mongoose.Schema.Types.Mixed,
  '@type': { type: String, default: 'ProductOrder' }
}, {
  timestamps: true,
  collection: 'productorders'
});

const CancelProductOrderSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'terminatedWithErrors', 'done'],
    default: 'acknowledged' 
  },
  creationDate: { type: Date, default: Date.now },
  cancellationReason: String,
  requestedCancellationDate: Date,
  effectiveCancellationDate: Date,
  productOrder: {
    id: { type: String, required: true },
    href: String,
    '@type': { type: String, default: 'ProductOrderRef' },
    '@referredType': { type: String, default: 'ProductOrder' }
  },
  '@type': { type: String, default: 'CancelProductOrder' }
}, {
  timestamps: true,
  collection: 'cancelproductorders'
});

// ===================================
// TMF688 - EVENT MANAGEMENT MODELS
// ===================================

const EventSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  eventId: { type: String, default: uuidv4 },
  eventTime: { type: Date, default: Date.now },
  eventType: { type: String, required: true },
  correlationId: String,
  domain: String,
  title: String,
  description: String,
  timeOccurred: { type: Date, default: Date.now },
  priority: { 
    type: String, 
    enum: ['Low', 'Normal', 'High', 'Critical'],
    default: 'Normal' 
  },
  source: mongoose.Schema.Types.Mixed,
  reportingSystem: mongoose.Schema.Types.Mixed,
  relatedParty: [mongoose.Schema.Types.Mixed],
  event: { type: mongoose.Schema.Types.Mixed, required: true },
  analyticCharacteristic: [mongoose.Schema.Types.Mixed],
  '@type': { type: String, default: 'Event' },
  '@baseType': { type: String, default: 'event' },
  '@schemaLocation': String
}, {
  timestamps: true,
  collection: 'events'
});

const HubSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  callback: { type: String, required: true },
  query: String,
  '@type': { type: String, default: 'Hub' },
  '@baseType': { type: String, default: 'hub' },
  '@schemaLocation': String
}, {
  timestamps: true,
  collection: 'hubs'
});

const TopicSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, default: uuidv4 },
  href: String,
  name: { type: String, required: true },
  contentQuery: String,
  headerQuery: String,
  '@type': { type: String, default: 'Topic' },
  '@baseType': { type: String, default: 'topic' },
  '@schemaLocation': String
}, {
  timestamps: true,
  collection: 'topics'
});

// ===================================
// MIDDLEWARE TO SET HREF
// ===================================

const setHrefMiddleware = function(next) {
  if (!this.href && this.id) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Set href based on schema collection name
    switch (this.collection.name) {
      case 'categories':
        this.href = `${baseUrl}/productCatalogManagement/v5/category/${this.id}`;
        break;
      case 'productspecifications':
        this.href = `${baseUrl}/productCatalogManagement/v5/productSpecification/${this.id}`;
        break;
      case 'productofferings':
        this.href = `${baseUrl}/productCatalogManagement/v5/productOffering/${this.id}`;
        break;
      case 'productofferingprices':
        this.href = `${baseUrl}/productCatalogManagement/v5/productOfferingPrice/${this.id}`;
        break;
      case 'productcatalogs':
        this.href = `${baseUrl}/productCatalogManagement/v5/productCatalog/${this.id}`;
        break;
      case 'products':
        this.href = `${baseUrl}/tmf-api/product/${this.id}`;
        break;
      case 'checkproductofferingqualifications':
        this.href = `${baseUrl}/productOfferingQualification/v5/checkProductOfferingQualification/${this.id}`;
        break;
      case 'queryproductofferingqualifications':
        this.href = `${baseUrl}/productOfferingQualification/v5/queryProductOfferingQualification/${this.id}`;
        break;
      case 'productorders':
        this.href = `${baseUrl}/productOrderingManagement/v4/productOrder/${this.id}`;
        break;
      case 'cancelproductorders':
        this.href = `${baseUrl}/productOrderingManagement/v4/cancelProductOrder/${this.id}`;
        break;
      case 'events':
        this.href = `${baseUrl}/tmf-api/event/v4/event/${this.id}`;
        break;
      case 'hubs':
        this.href = `${baseUrl}/tmf-api/event/v4/hub/${this.id}`;
        break;
      case 'topics':
        this.href = `${baseUrl}/tmf-api/event/v4/topic/${this.id}`;
        break;
    }
  }
  next();
};

// Apply middleware to all schemas
[CategorySchema, ProductSpecificationSchema, ProductOfferingSchema, ProductOfferingPriceSchema, 
 ProductCatalogSchema, ProductSchema, CheckProductOfferingQualificationSchema, 
 QueryProductOfferingQualificationSchema, ProductOrderSchema, CancelProductOrderSchema,
 EventSchema, HubSchema, TopicSchema].forEach(schema => {
  schema.pre('save', setHrefMiddleware);
});

// ===================================
// CREATE AND EXPORT MODELS
// ===================================

const Category = mongoose.model('Category', CategorySchema);
const ProductSpecification = mongoose.model('ProductSpecification', ProductSpecificationSchema);
const ProductOffering = mongoose.model('ProductOffering', ProductOfferingSchema);
const ProductOfferingPrice = mongoose.model('ProductOfferingPrice', ProductOfferingPriceSchema);
const ProductCatalog = mongoose.model('ProductCatalog', ProductCatalogSchema);
const Product = mongoose.model('Product', ProductSchema);
const CheckProductOfferingQualification = mongoose.model('CheckProductOfferingQualification', CheckProductOfferingQualificationSchema);
const QueryProductOfferingQualification = mongoose.model('QueryProductOfferingQualification', QueryProductOfferingQualificationSchema);
const ProductOrder = mongoose.model('ProductOrder', ProductOrderSchema);
const CancelProductOrder = mongoose.model('CancelProductOrder', CancelProductOrderSchema);
const Event = mongoose.model('Event', EventSchema);
const Hub = mongoose.model('Hub', HubSchema);
const Topic = mongoose.model('Topic', TopicSchema);

module.exports = {
  // TMF620 Models
  Category,
  ProductSpecification,
  ProductOffering,
  ProductOfferingPrice,
  ProductCatalog,
  
  // TMF637 Models
  Product,
  
  // TMF679 Models
  CheckProductOfferingQualification,
  QueryProductOfferingQualification,
  
  // TMF622 Models
  ProductOrder,
  CancelProductOrder,
  
  // TMF688 Models
  Event,
  Hub,
  Topic
};