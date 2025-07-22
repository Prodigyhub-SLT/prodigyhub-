const Joi = require('joi');

// Basic primitive schemas first
const MoneySchema = Joi.object({
  unit: Joi.string().required(),
  value: Joi.number().required()
});

const EnhancedMoneySchema = MoneySchema.keys({
  unit: Joi.string().valid(
    'USD', 'EUR', 'GBP', 'LKR', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'SGD'
  ).required()
});

const TimePeriodSchema = Joi.object({
  endDateTime: Joi.date(),
  startDateTime: Joi.date().when('endDateTime', {
    is: Joi.exist(),
    then: Joi.date().max(Joi.ref('endDateTime')),
    otherwise: Joi.date()
  })
});

const QuantitySchema = Joi.object({
  amount: Joi.number().min(0).required(),
  units: Joi.string().required()
});

const DurationSchema = Joi.object({
  amount: Joi.number().required(),
  units: Joi.string().required(),
  '@type': Joi.string().default('Duration')
});

const PriceSchema = Joi.object({
  dutyFreeAmount: MoneySchema,
  taxIncludedAmount: MoneySchema,
  taxRate: Joi.number().default(0),
  percentage: Joi.number(),
  '@type': Joi.string().default('Price')
});

const PriceAlterationSchema = Joi.object({
  applicationDuration: Joi.number(),
  description: Joi.string(),
  name: Joi.string(),
  price: PriceSchema,
  priceType: Joi.string().valid('recurring', 'oneTime', 'usage').required(),
  priority: Joi.number(),
  recurringChargePeriod: Joi.string(),
  unitOfMeasure: Joi.string(),
  '@type': Joi.string().default('PriceAlteration')
});

const OrderPriceSchema = Joi.object({
  description: Joi.string(),
  name: Joi.string(),
  price: PriceSchema,
  priceAlteration: Joi.array().items(PriceAlterationSchema),
  priceType: Joi.string().valid('recurring', 'oneTime', 'usage').required(),
  recurringChargePeriod: Joi.string(),
  unitOfMeasure: Joi.string(),
  '@type': Joi.string().default('OrderPrice')
});

const OrderTermSchema = Joi.object({
  description: Joi.string(),
  duration: DurationSchema,
  name: Joi.string(),
  '@type': Joi.string().default('OrderTerm')
});

// External Identifier Schema
const ExternalIdentifierSchema = Joi.object({
  externalIdentifierType: Joi.string(),
  id: Joi.string().required(),
  owner: Joi.string(),
  '@type': Joi.string().default('ExternalIdentifier')
});

// Note Schema
const NoteSchema = Joi.object({
  id: Joi.string(),
  author: Joi.string(),
  date: Joi.date(),
  text: Joi.string(),
  '@type': Joi.string().default('Note')
});

// Reference schemas - defined early
const ChannelRefSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string().required(),
  name: Joi.string(),
  '@type': Joi.string().default('ChannelRef'),
  '@referredType': Joi.string(),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
});

const RelatedChannelSchema = Joi.object({
  channel: ChannelRefSchema.required(),
  role: Joi.string().required(),
  '@type': Joi.string().default('RelatedChannel')
});

const BillingAccountRefSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string().required(),
  name: Joi.string(),
  ratingType: Joi.string(),
  '@type': Joi.string().default('BillingAccountRef'),
  '@referredType': Joi.string(),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
});

const PaymentRefSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string().required(),
  name: Joi.string(),
  '@type': Joi.string().default('PaymentRef'),
  '@referredType': Joi.string(),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
});

const ProductOfferingRefSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string().required(),
  name: Joi.string(),
  version: Joi.string(),
  '@type': Joi.string().default('ProductOfferingRef'),
  '@referredType': Joi.string(),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
});

const ProductSpecificationRefSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string().required(),
  name: Joi.string(),
  version: Joi.string(),
  '@type': Joi.string().default('ProductSpecificationRef'),
  '@referredType': Joi.string(),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
});

const EnhancedProductSpecificationRefSchema = ProductSpecificationRefSchema.keys({
  targetProductSchema: Joi.object().keys({
    '@schemaLocation': Joi.string().uri().required(),
    '@type': Joi.string().required()
  })
});

const OrderItemRelationshipSchema = Joi.object({
  id: Joi.string().required(),
  relationshipType: Joi.string().valid('bundles', 'reliesOn', 'substitutes', 'excludes').required(),
  '@type': Joi.string().default('OrderItemRelationship')
});

// Characteristic schemas
const CharacteristicRelationshipSchema = Joi.object({
  id: Joi.string(),
  relationshipType: Joi.string(),
  '@type': Joi.string().default('CharacteristicRelationship')
});

const BaseCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  valueType: Joi.string(),
  '@type': Joi.string()
});

const StringCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.string().required(),
  valueType: Joi.string().default('string'),
  '@type': Joi.string().default('StringCharacteristic')
});

const IntegerCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.number().integer().required(),
  valueType: Joi.string().default('integer'),
  '@type': Joi.string().default('IntegerCharacteristic')
});

const FloatCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.number().required(),
  valueType: Joi.string().default('float'),
  '@type': Joi.string().default('FloatCharacteristic')
});

const BooleanCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.boolean().required(),
  valueType: Joi.string().default('boolean'),
  '@type': Joi.string().default('BooleanCharacteristic')
});

const ObjectCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.object().required(),
  valueType: Joi.string().default('object'),
  '@type': Joi.string().default('ObjectCharacteristic')
});

const StringArrayCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.array().items(Joi.string()).required(),
  valueType: Joi.string().default('stringArray'),
  '@type': Joi.string().default('StringArrayCharacteristic')
});

const IntegerArrayCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.array().items(Joi.number().integer()).required(),
  valueType: Joi.string().default('integerArray'),
  '@type': Joi.string().default('IntegerArrayCharacteristic')
});

const FloatArrayCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.array().items(Joi.number()).required(),
  valueType: Joi.string().default('floatArray'),
  '@type': Joi.string().default('FloatArrayCharacteristic')
});

const BooleanArrayCharacteristicSchema = Joi.object({
  characteristicRelationship: Joi.array().items(CharacteristicRelationshipSchema),
  id: Joi.string(),
  name: Joi.string().required(),
  value: Joi.array().items(Joi.boolean()).required(),
  valueType: Joi.string().default('booleanArray'),
  '@type': Joi.string().default('BooleanArrayCharacteristic')
});

// Enhanced characteristic validation that handles all types
const EnhancedCharacteristicSchema = Joi.alternatives().try(
  StringCharacteristicSchema,
  IntegerCharacteristicSchema,
  FloatCharacteristicSchema,
  BooleanCharacteristicSchema,
  ObjectCharacteristicSchema,
  StringArrayCharacteristicSchema,
  IntegerArrayCharacteristicSchema,
  FloatArrayCharacteristicSchema,
  BooleanArrayCharacteristicSchema,
  BaseCharacteristicSchema
);

// Product Schema - defined after all its dependencies
const ProductSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string(),
  name: Joi.string(),
  description: Joi.string(),
  isBundle: Joi.boolean().default(false),
  isCustomerVisible: Joi.boolean().default(true),
  orderDate: Joi.date(),
  startDate: Joi.date(),
  terminationDate: Joi.date(),
  creationDate: Joi.date(),
  status: Joi.string().valid(
    'created', 'pendingActive', 'cancelled', 'active', 'pendingTerminate', 
    'terminated', 'suspended', 'aborted'
  ),
  productCharacteristic: Joi.array().items(EnhancedCharacteristicSchema),
  productSpecification: ProductSpecificationRefSchema,
  productOffering: ProductOfferingRefSchema,
  productSerialNumber: Joi.string(),
  '@type': Joi.string().default('Product'),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
});

// Related Party Schema
const RelatedPartyRefSchema = Joi.object({
  partyOrPartyRole: Joi.object({
    href: Joi.string().uri(),
    id: Joi.string().required(),
    name: Joi.string(),
    '@type': Joi.string().required(),
    '@referredType': Joi.string()
  }).required(),
  role: Joi.string().valid('customer', 'seller', 'buyer', 'payer', 'user', 'salesAgent').required(),
  '@type': Joi.string().default('RelatedPartyRefOrPartyRoleRef')
});

// Product Order Item Schema - defined after all dependencies
const ProductOrderItemSchema = Joi.object({
  id: Joi.string().required(),
  action: Joi.string().valid('add', 'modify', 'delete', 'noChange').required(),
  appointment: Joi.object().keys({
    description: Joi.string(),
    href: Joi.string().uri(),
    id: Joi.string().required(),
    name: Joi.string(),
    '@type': Joi.string().default('AppointmentRef'),
    '@referredType': Joi.string(),
    '@baseType': Joi.string(),
    '@schemaLocation': Joi.string().uri()
  }),
  billingAccount: BillingAccountRefSchema,
  itemPrice: Joi.array().items(OrderPriceSchema),
  itemTerm: Joi.array().items(OrderTermSchema),
  itemTotalPrice: Joi.array().items(OrderPriceSchema),
  note: Joi.array().items(NoteSchema),
  payment: Joi.array().items(PaymentRefSchema),
  product: ProductSchema,
  productOffering: ProductOfferingRefSchema,
  productOfferingQualificationItem: Joi.object().keys({
    itemId: Joi.string().required(),
    productOfferingQualificationHref: Joi.string().uri(),
    productOfferingQualificationId: Joi.string().required(),
    productOfferingQualificationName: Joi.string(),
    '@type': Joi.string().default('ProductOfferingQualificationItemRef'),
    '@referredType': Joi.string(),
    '@baseType': Joi.string(),
    '@schemaLocation': Joi.string().uri()
  }),
  productOrderItem: Joi.array().items(Joi.link('#productOrderItem')),
  productOrderItemRelationship: Joi.array().items(OrderItemRelationshipSchema),
  qualification: Joi.object().keys({
    href: Joi.string().uri(),
    id: Joi.string().required(),
    name: Joi.string(),
    '@type': Joi.string().default('ProductOfferingQualificationRef'),
    '@referredType': Joi.string(),
    '@baseType': Joi.string(),
    '@schemaLocation': Joi.string().uri()
  }),
  quantity: Joi.number().integer().min(1).default(1),
  quoteItem: Joi.object().keys({
    quoteHref: Joi.string().uri(),
    quoteId: Joi.string().required(),
    quoteItemId: Joi.string().required(),
    '@type': Joi.string().default('QuoteItemRef'),
    '@referredType': Joi.string(),
    '@baseType': Joi.string(),
    '@schemaLocation': Joi.string().uri()
  }),
  state: Joi.string().valid(
    'acknowledged', 'rejected', 'pending', 'held', 'inProgress', 
    'cancelled', 'completed', 'failed', 'partial', 'assessingCancellation', 
    'pendingCancellation'
  ).default('acknowledged'),
  '@type': Joi.string().default('ProductOrderItem'),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri()
}).id('productOrderItem');

// Main Product Order Create Schema
const ProductOrderCreateSchema = Joi.object({
  // Basic info
  category: Joi.string(),
  description: Joi.string(),
  notificationContact: Joi.string(),
  priority: Joi.string().valid('0', '1', '2', '3', '4').default('4'),
  
  // Dates
  requestedCompletionDate: Joi.date(),
  requestedStartDate: Joi.date(),
  
  // State management
  requestedInitialState: Joi.string().valid('acknowledged').default('acknowledged'),
  
  // References and relationships
  agreement: Joi.object(),
  billingAccount: BillingAccountRefSchema,
  channel: Joi.array().items(RelatedChannelSchema),
  externalId: Joi.array().items(ExternalIdentifierSchema),
  note: Joi.array().items(NoteSchema),
  orderRelationship: Joi.object(),
  orderTotalPrice: Joi.array().items(OrderPriceSchema),
  payment: Joi.array().items(PaymentRefSchema),
  productOfferingQualification: Joi.object(),
  quote: Joi.object(),
  relatedParty: Joi.array().items(RelatedPartyRefSchema),
  
  // Order items - required
  productOrderItem: Joi.array().items(ProductOrderItemSchema).min(1).required(),
  
  // TMF metadata
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri(),
  '@type': Joi.string().default('ProductOrder')
}).options({ stripUnknown: true });

// Product Order Update Schema
const ProductOrderUpdateSchema = Joi.object({
  // Basic info
  category: Joi.string(),
  description: Joi.string(),
  notificationContact: Joi.string(),
  priority: Joi.string().valid('0', '1', '2', '3', '4'),
  
  // Dates
  expectedCompletionDate: Joi.date(),
  requestedCompletionDate: Joi.date(),
  requestedStartDate: Joi.date(),
  cancellationDate: Joi.date(),
  cancellationReason: Joi.string(),
  
  // State management
  state: Joi.string().valid(
    'acknowledged', 'rejected', 'pending', 'held', 'inProgress', 
    'cancelled', 'completed', 'failed', 'partial', 'assessingCancellation', 
    'pendingCancellation'
  ),
  
  // References and relationships
  agreement: Joi.object(),
  billingAccount: BillingAccountRefSchema,
  channel: Joi.array().items(RelatedChannelSchema),
  note: Joi.array().items(NoteSchema),
  orderRelationship: Joi.object(),
  orderTotalPrice: Joi.array().items(OrderPriceSchema),
  payment: Joi.array().items(PaymentRefSchema),
  productOfferingQualification: Joi.object(),
  quote: Joi.object(),
  relatedParty: Joi.array().items(RelatedPartyRefSchema),
  
  // Order items
  productOrderItem: Joi.array().items(ProductOrderItemSchema),
  
  // Error handling and alerts
  productOrderErrorMessage: Joi.array().items(Joi.object({
    code: Joi.string(),
    message: Joi.string(),
    reason: Joi.string(),
    referenceError: Joi.string(),
    status: Joi.string(),
    timestamp: Joi.date(),
    productOrderItem: Joi.object(),
    '@type': Joi.string().default('ProductOrderErrorMessage')
  })),
  
  productOrderJeopardyAlert: Joi.array().items(Joi.object({
    alertDate: Joi.date(),
    exception: Joi.string(),
    id: Joi.string(),
    jeopardyType: Joi.string(),
    message: Joi.string(),
    name: Joi.string(),
    productOrderItem: Joi.object(),
    '@type': Joi.string().default('ProductOrderJeopardyAlert')
  })),
  
  productOrderMilestone: Joi.array().items(Joi.object({
    description: Joi.string(),
    id: Joi.string(),
    message: Joi.string(),
    milestoneDate: Joi.date(),
    name: Joi.string(),
    status: Joi.string(),
    productOrderItem: Joi.object(),
    '@type': Joi.string().default('ProductOrderMilestone')
  })),
  
  // TMF metadata (read-only fields should not be updated)
  '@type': Joi.string().forbidden()
}).options({ stripUnknown: true });

// Product Order Reference Schema
const ProductOrderRefSchema = Joi.object({
  href: Joi.string().uri(),
  id: Joi.string().required(),
  name: Joi.string(),
  '@type': Joi.string().default('ProductOrderRef'),
  '@referredType': Joi.string().default('ProductOrder')
}).options({ stripUnknown: true });

// Cancel Product Order Schemas
const CancelProductOrderCreateSchema = Joi.object({
  cancellationReason: Joi.string().max(500),
  requestedCancellationDate: Joi.date().min('now'),
  productOrder: ProductOrderRefSchema.required(),
  '@baseType': Joi.string(),
  '@schemaLocation': Joi.string().uri(),
  '@type': Joi.string().default('CancelProductOrder')
}).options({ stripUnknown: true });

const CancelProductOrderUpdateSchema = Joi.object({
  cancellationReason: Joi.string().max(500),
  requestedCancellationDate: Joi.date(),
  effectiveCancellationDate: Joi.date(),
  state: Joi.string().valid('acknowledged', 'inProgress', 'terminatedWithErrors', 'done'),
  '@type': Joi.string().forbidden()
}).options({ stripUnknown: true });

// Query Parameter Validation
const ProductOrderQuerySchema = Joi.object({
  fields: Joi.string().pattern(/^[a-zA-Z0-9,._@\-\s]+$/),
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  state: Joi.string().valid(
    'acknowledged', 'rejected', 'pending', 'held', 'inProgress', 
    'cancelled', 'completed', 'failed', 'partial', 'assessingCancellation', 
    'pendingCancellation'
  ),
  category: Joi.string().max(100),
  priority: Joi.string().valid('0', '1', '2', '3', '4'),
  'relatedParty.id': Joi.string(),
  'creationDate.gte': Joi.date().iso(),
  'creationDate.lte': Joi.date().iso().min(Joi.ref('creationDate.gte')),
  'requestedCompletionDate.gte': Joi.date().iso(),
  'requestedCompletionDate.lte': Joi.date().iso().min(Joi.ref('requestedCompletionDate.gte'))
}).options({ stripUnknown: true });

const CancelProductOrderQuerySchema = Joi.object({
  fields: Joi.string().pattern(/^[a-zA-Z0-9,._@\-\s]+$/),
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  state: Joi.string().valid('acknowledged', 'inProgress', 'terminatedWithErrors', 'done'),
  'productOrder.id': Joi.string(),
  'creationDate.gte': Joi.date().iso(),
  'creationDate.lte': Joi.date().iso().min(Joi.ref('creationDate.gte'))
}).options({ stripUnknown: true });

// Path Parameter Validation
const ProductOrderIdSchema = Joi.object({
  id: Joi.string().required().pattern(/^[a-zA-Z0-9\-_]+$/).min(1).max(255)
});

const CancelProductOrderIdSchema = Joi.object({
  id: Joi.string().required().pattern(/^[a-zA-Z0-9\-_]+$/).min(1).max(255)
});

// Request Headers Validation
const CommonHeadersSchema = Joi.object({
  'content-type': Joi.string().valid(
    'application/json', 
    'application/merge-patch+json', 
    'application/json-patch+json'
  ),
  'x-request-id': Joi.string().uuid(),
  'authorization': Joi.string(),
  'accept': Joi.string().default('application/json')
}).unknown(true);

// Business Rule Validation
const BusinessRuleValidationSchema = Joi.object({
  validateOrderItemRelationships: Joi.boolean().default(true),
  validateProductOfferingAvailability: Joi.boolean().default(true),
  validatePricingConsistency: Joi.boolean().default(true),
  validateCustomerEligibility: Joi.boolean().default(false)
});

// Response Schemas
const ErrorResponseSchema = Joi.object({
  error: Joi.string().required(),
  message: Joi.string().required(),
  code: Joi.string().required(),
  requestId: Joi.string().uuid(),
  details: Joi.array().items(Joi.object({
    field: Joi.string(),
    message: Joi.string(),
    code: Joi.string()
  }))
});

const ProductOrderResponseSchema = ProductOrderCreateSchema.keys({
  id: Joi.string().required(),
  href: Joi.string().uri().required(),
  creationDate: Joi.date().required(),
  state: Joi.string().required()
});

const CancelProductOrderResponseSchema = CancelProductOrderCreateSchema.keys({
  id: Joi.string().required(),
  href: Joi.string().uri().required(),
  creationDate: Joi.date().required(),
  state: Joi.string().required()
});

// Export all schemas
module.exports = {
  // Main schemas
  ProductOrderCreateSchema,
  ProductOrderUpdateSchema,
  CancelProductOrderCreateSchema,
  CancelProductOrderUpdateSchema,
  ProductOrderQuerySchema,
  CancelProductOrderQuerySchema,
  
  // Component schemas
  ProductOrderItemSchema,
  ProductSchema,
  ProductOfferingRefSchema,
  ProductSpecificationRefSchema,
  EnhancedProductSpecificationRefSchema,
  RelatedPartyRefSchema,
  ExternalIdentifierSchema,
  RelatedChannelSchema,
  ChannelRefSchema,
  NoteSchema,
  OrderPriceSchema,
  PriceAlterationSchema,
  PriceSchema,
  MoneySchema,
  EnhancedMoneySchema,
  OrderTermSchema,
  DurationSchema,
  BillingAccountRefSchema,
  PaymentRefSchema,
  OrderItemRelationshipSchema,
  
  // Characteristic schemas
  BaseCharacteristicSchema,
  StringCharacteristicSchema,
  IntegerCharacteristicSchema,
  FloatCharacteristicSchema,
  BooleanCharacteristicSchema,
  ObjectCharacteristicSchema,
  StringArrayCharacteristicSchema,
  IntegerArrayCharacteristicSchema,
  FloatArrayCharacteristicSchema,
  BooleanArrayCharacteristicSchema,
  EnhancedCharacteristicSchema,
  CharacteristicRelationshipSchema,
  
  // Validation helpers
  ProductOrderIdSchema,
  CancelProductOrderIdSchema,
  CommonHeadersSchema,
  BusinessRuleValidationSchema,
  
  // Response schemas
  ErrorResponseSchema,
  ProductOrderResponseSchema,
  CancelProductOrderResponseSchema,
  
  // Reference schemas
  ProductOrderRefSchema,
  TimePeriodSchema,
  QuantitySchema
};