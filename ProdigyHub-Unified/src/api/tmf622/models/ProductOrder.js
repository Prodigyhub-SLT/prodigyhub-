const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Sub-schemas based on TMF622 specification

// Money schema for pricing
const MoneySchema = new mongoose.Schema({
  unit: { type: String, required: true }, // Currency code (EUR, USD, LKR)
  value: { type: Number, required: true }
}, { _id: false });

// Price schema
const PriceSchema = new mongoose.Schema({
  dutyFreeAmount: MoneySchema,
  taxIncludedAmount: MoneySchema,
  taxRate: { type: Number, default: 0 },
  percentage: Number,
  '@type': { type: String, default: 'Price' }
}, { _id: false });

// Price Alteration schema
const PriceAlterationSchema = new mongoose.Schema({
  applicationDuration: Number,
  description: String,
  name: String,
  price: PriceSchema,
  priceType: { 
    type: String, 
    enum: ['recurring', 'oneTime', 'usage'],
    required: true 
  },
  priority: Number,
  recurringChargePeriod: String,
  unitOfMeasure: String,
  '@type': { type: String, default: 'PriceAlteration' }
}, { _id: false });

// Order Price schema
const OrderPriceSchema = new mongoose.Schema({
  description: String,
  name: String,
  price: PriceSchema,
  priceAlteration: [PriceAlterationSchema],
  priceType: { 
    type: String, 
    enum: ['recurring', 'oneTime', 'usage'],
    required: true 
  },
  recurringChargePeriod: String,
  unitOfMeasure: String,
  '@type': { type: String, default: 'OrderPrice' }
}, { _id: false });

// Duration schema
const DurationSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  units: { type: String, required: true }, // month, week, day, etc.
  '@type': { type: String, default: 'Duration' }
}, { _id: false });

// Order Term schema
const OrderTermSchema = new mongoose.Schema({
  description: String,
  duration: DurationSchema,
  name: String,
  '@type': { type: String, default: 'OrderTerm' }
}, { _id: false });

// Characteristic schemas for different types
const CharacteristicRelationshipSchema = new mongoose.Schema({
  id: String,
  relationshipType: String,
  '@type': { type: String, default: 'CharacteristicRelationship' }
}, { _id: false });

const BaseCharacteristicSchema = new mongoose.Schema({
  characteristicRelationship: [CharacteristicRelationshipSchema],
  id: String,
  name: { type: String, required: true },
  valueType: String
}, { _id: false, discriminatorKey: '@type' });

const StringCharacteristicSchema = new mongoose.Schema({
  value: String
});

const IntegerCharacteristicSchema = new mongoose.Schema({
  value: Number
});

const BooleanCharacteristicSchema = new mongoose.Schema({
  value: Boolean
});

const FloatCharacteristicSchema = new mongoose.Schema({
  value: Number
});

const ObjectCharacteristicSchema = new mongoose.Schema({
  value: mongoose.Schema.Types.Mixed
});

// Product Specification Reference
const ProductSpecificationRefSchema = new mongoose.Schema({
  href: String,
  id: { type: String, required: true },
  name: String,
  version: String,
  '@type': { type: String, default: 'ProductSpecificationRef' },
  '@referredType': String
}, { _id: false });

// Product Offering Reference
const ProductOfferingRefSchema = new mongoose.Schema({
  href: String,
  id: { type: String, required: true },
  name: String,
  version: String,
  '@type': { type: String, default: 'ProductOfferingRef' },
  '@referredType': String
}, { _id: false });

// Product schema (for order items)
const ProductSchema = new mongoose.Schema({
  href: String,
  id: String,
  name: String,
  description: String,
  isBundle: { type: Boolean, default: false },
  isCustomerVisible: { type: Boolean, default: true },
  productCharacteristic: [BaseCharacteristicSchema],
  productSpecification: ProductSpecificationRefSchema,
  '@type': { type: String, default: 'Product' }
}, { _id: false });

// Order Item Relationship
const OrderItemRelationshipSchema = new mongoose.Schema({
  id: { type: String, required: true },
  relationshipType: { 
    type: String, 
    required: true,
    enum: ['bundles', 'reliesOn', 'substitutes', 'excludes']
  },
  '@type': { type: String, default: 'OrderItemRelationship' }
}, { _id: false });

// Payment Reference
const PaymentRefSchema = new mongoose.Schema({
  href: String,
  id: { type: String, required: true },
  name: String,
  '@type': { type: String, default: 'PaymentRef' },
  '@referredType': String
}, { _id: false });

// Billing Account Reference
const BillingAccountRefSchema = new mongoose.Schema({
  href: String,
  id: { type: String, required: true },
  name: String,
  ratingType: String,
  '@type': { type: String, default: 'BillingAccountRef' },
  '@referredType': String
}, { _id: false });

// Product Order Item schema
const ProductOrderItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  action: { 
    type: String, 
    required: true,
    enum: ['add', 'modify', 'delete', 'noChange']
  },
  appointment: mongoose.Schema.Types.Mixed, // AppointmentRef
  billingAccount: BillingAccountRefSchema,
  itemPrice: [OrderPriceSchema],
  itemTerm: [OrderTermSchema],
  itemTotalPrice: [OrderPriceSchema],
  note: [{
    id: String,
    author: String,
    date: { type: Date, default: Date.now },
    text: String,
    '@type': { type: String, default: 'Note' }
  }],
  payment: [PaymentRefSchema],
  product: ProductSchema,
  productOffering: ProductOfferingRefSchema,
  productOfferingQualificationItem: mongoose.Schema.Types.Mixed,
  productOrderItem: [mongoose.Schema.Types.Mixed], // Nested order items
  productOrderItemRelationship: [OrderItemRelationshipSchema],
  qualification: mongoose.Schema.Types.Mixed,
  quantity: { type: Number, default: 1 },
  quoteItem: mongoose.Schema.Types.Mixed,
  state: { 
    type: String, 
    enum: [
      'acknowledged', 'rejected', 'pending', 'held', 'inProgress', 
      'cancelled', 'completed', 'failed', 'partial', 'assessingCancellation', 
      'pendingCancellation'
    ],
    default: 'acknowledged'
  },
  '@type': { type: String, default: 'ProductOrderItem' }
}, { _id: false });

// Related Party Reference
const RelatedPartyRefSchema = new mongoose.Schema({
  partyOrPartyRole: {
    href: String,
    id: { type: String, required: true },
    name: String,
    '@type': { type: String, required: true },
    '@referredType': String
  },
  role: { 
    type: String, 
    required: true,
    enum: ['customer', 'seller', 'buyer', 'payer', 'user', 'salesAgent']
  },
  '@type': { type: String, default: 'RelatedPartyRefOrPartyRoleRef' }
}, { _id: false });

// External Identifier
const ExternalIdentifierSchema = new mongoose.Schema({
  externalIdentifierType: String,
  id: { type: String, required: true },
  owner: String,
  '@type': { type: String, default: 'ExternalIdentifier' }
}, { _id: false });

// Channel Reference
const ChannelRefSchema = new mongoose.Schema({
  href: String,
  id: { type: String, required: true },
  name: String,
  '@type': { type: String, default: 'ChannelRef' },
  '@referredType': String
}, { _id: false });

const RelatedChannelSchema = new mongoose.Schema({
  channel: ChannelRefSchema,
  role: String,
  '@type': { type: String, default: 'RelatedChannel' }
}, { _id: false });

// Note schema
const NoteSchema = new mongoose.Schema({
  id: String,
  author: String,
  date: { type: Date, default: Date.now },
  text: String,
  '@type': { type: String, default: 'Note' }
}, { _id: false });

// Main Product Order Schema
const ProductOrderSchema = new mongoose.Schema({
  id: { 
    type: String, 
    default: uuidv4,
    unique: true,
    required: true 
  },
  href: String,
  
  // Dates
  creationDate: { type: Date, default: Date.now },
  completionDate: Date,
  expectedCompletionDate: Date,
  requestedCompletionDate: Date,
  requestedStartDate: Date,
  cancellationDate: Date,
  
  // Basic info
  category: String, // B2C, B2B, enterprise, residential
  description: String,
  cancellationReason: String,
  notificationContact: String,
  priority: { 
    type: String, 
    enum: ['0', '1', '2', '3', '4'],
    default: '4' // 0 is highest priority
  },
  
  // State management
  state: { 
    type: String, 
    enum: [
      'acknowledged', 'rejected', 'pending', 'held', 'inProgress', 
      'cancelled', 'completed', 'failed', 'partial', 'assessingCancellation', 
      'pendingCancellation'
    ],
    default: 'acknowledged'
  },
  
  requestedInitialState: {
    type: String,
    enum: ['acknowledged'],
    default: 'acknowledged'
  },
  
  // References and relationships
  agreement: mongoose.Schema.Types.Mixed, // AgreementRef
  billingAccount: BillingAccountRefSchema,
  channel: [RelatedChannelSchema],
  externalId: [ExternalIdentifierSchema],
  note: [NoteSchema],
  orderRelationship: mongoose.Schema.Types.Mixed,
  orderTotalPrice: [OrderPriceSchema],
  payment: [PaymentRefSchema],
  productOfferingQualification: mongoose.Schema.Types.Mixed,
  quote: mongoose.Schema.Types.Mixed,
  relatedParty: [RelatedPartyRefSchema],
  
  // Order items - the main content
  productOrderItem: { 
    type: [ProductOrderItemSchema], 
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'ProductOrder must have at least one ProductOrderItem'
    }
  },
  
  // Error handling and alerts
  productOrderErrorMessage: [{
    code: String,
    message: String,
    reason: String,
    referenceError: String,
    status: String,
    timestamp: { type: Date, default: Date.now },
    productOrderItem: mongoose.Schema.Types.Mixed,
    '@type': { type: String, default: 'ProductOrderErrorMessage' }
  }],
  
  productOrderJeopardyAlert: [{
    alertDate: { type: Date, default: Date.now },
    exception: String,
    id: String,
    jeopardyType: String,
    message: String,
    name: String,
    productOrderItem: mongoose.Schema.Types.Mixed,
    '@type': { type: String, default: 'ProductOrderJeopardyAlert' }
  }],
  
  productOrderMilestone: [{
    description: String,
    id: String,
    message: String,
    milestoneDate: { type: Date, default: Date.now },
    name: String,
    status: String,
    productOrderItem: mongoose.Schema.Types.Mixed,
    '@type': { type: String, default: 'ProductOrderMilestone' }
  }],
  
  // TMF metadata
  '@baseType': String,
  '@schemaLocation': String,
  '@type': { type: String, default: 'ProductOrder' }
}, {
  timestamps: true,
  versionKey: false
});

// Add discriminators for characteristic types
ProductOrderSchema.path('productOrderItem').schema.path('product').schema.path('productCharacteristic').discriminator('StringCharacteristic', StringCharacteristicSchema);
ProductOrderSchema.path('productOrderItem').schema.path('product').schema.path('productCharacteristic').discriminator('IntegerCharacteristic', IntegerCharacteristicSchema);
ProductOrderSchema.path('productOrderItem').schema.path('product').schema.path('productCharacteristic').discriminator('BooleanCharacteristic', BooleanCharacteristicSchema);
ProductOrderSchema.path('productOrderItem').schema.path('product').schema.path('productCharacteristic').discriminator('FloatCharacteristic', FloatCharacteristicSchema);
ProductOrderSchema.path('productOrderItem').schema.path('product').schema.path('productCharacteristic').discriminator('ObjectCharacteristic', ObjectCharacteristicSchema);

// Indexes for performance
ProductOrderSchema.index({ id: 1 });
ProductOrderSchema.index({ state: 1 });
ProductOrderSchema.index({ creationDate: -1 });
ProductOrderSchema.index({ 'relatedParty.partyOrPartyRole.id': 1 });
ProductOrderSchema.index({ category: 1 });

// Generate href before saving
ProductOrderSchema.pre('save', function(next) {
  if (!this.href && this.id) {
    this.href = `${process.env.BASE_PATH || '/productOrderingManagement'}/${process.env.API_VERSION || 'v4'}/productOrder/${this.id}`;
  }
  next();
});

// Instance methods
ProductOrderSchema.methods.toTMFFormat = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

// Static methods
ProductOrderSchema.statics.findByPartyId = function(partyId) {
  return this.find({ 'relatedParty.partyOrPartyRole.id': partyId });
};

ProductOrderSchema.statics.findByState = function(state) {
  return this.find({ state: state });
};

module.exports = mongoose.model('ProductOrder', ProductOrderSchema);