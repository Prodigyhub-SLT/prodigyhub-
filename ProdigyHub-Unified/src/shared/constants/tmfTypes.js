// src/shared/constants/tmfTypes.js
module.exports = {
  // TMF620 Types
  TMF620: {
    CATEGORY: 'Category',
    PRODUCT_SPECIFICATION: 'ProductSpecification',
    PRODUCT_OFFERING: 'ProductOffering',
    PRODUCT_OFFERING_PRICE: 'ProductOfferingPrice',
    PRODUCT_CATALOG: 'Catalog',
    CHARACTERISTIC_SPECIFICATION: 'CharacteristicSpecification',
    CHARACTERISTIC_VALUE_SPECIFICATION: 'CharacteristicValueSpecification',
    IMPORT_JOB: 'ImportJob',
    EXPORT_JOB: 'ExportJob'
  },
  
  // TMF637 Types
  TMF637: {
    PRODUCT: 'Product',
    PRODUCT_RELATIONSHIP: 'ProductRelationship',
    PRODUCT_CHARACTERISTIC: 'ProductCharacteristic'
  },
  
  // TMF679 Types
  TMF679: {
    CHECK_PRODUCT_OFFERING_QUALIFICATION: 'CheckProductOfferingQualification',
    QUERY_PRODUCT_OFFERING_QUALIFICATION: 'QueryProductOfferingQualification',
    QUALIFICATION_ITEM: 'QualificationItem',
    STATE_REASON: 'StateReason'
  },
  
  // TMF622 Types
  TMF622: {
    PRODUCT_ORDER: 'ProductOrder',
    PRODUCT_ORDER_ITEM: 'ProductOrderItem',
    CANCEL_PRODUCT_ORDER: 'CancelProductOrder',
    ORDER_PRICE: 'OrderPrice',
    ORDER_TERM: 'OrderTerm',
    ORDER_ITEM_RELATIONSHIP: 'OrderItemRelationship'
  },
  
  // TMF688 Types
  TMF688: {
    EVENT: 'Event',
    HUB: 'Hub',
    TOPIC: 'Topic'
  },
  
  // TMF760 Types
  TMF760: {
    CHECK_PRODUCT_CONFIGURATION: 'CheckProductConfiguration',
    QUERY_PRODUCT_CONFIGURATION: 'QueryProductConfiguration',
    PRODUCT_CONFIGURATION: 'ProductConfiguration',
    CONFIGURATION_CHARACTERISTIC: 'ConfigurationCharacteristic',
    CONFIGURATION_ACTION: 'ConfigurationAction'
  },
  
  // Common Types
  COMMON: {
    MONEY: 'Money',
    PRICE: 'Price',
    DURATION: 'Duration',
    NOTE: 'Note',
    RELATED_PARTY: 'RelatedPartyRefOrPartyRoleRef',
    ATTACHMENT: 'AttachmentRefOrValue',
    CHANNEL_REF: 'ChannelRef',
    PLACE_REF: 'PlaceRef'
  },
  
  // Task States
  TASK_STATES: {
    ACKNOWLEDGED: 'acknowledged',
    IN_PROGRESS: 'inProgress',
    REJECTED: 'rejected',
    TERMINATED_WITH_ERROR: 'terminatedWithError',
    CANCELLED: 'cancelled',
    DONE: 'done'
  },
  
  // Product Order States
  ORDER_STATES: {
    ACKNOWLEDGED: 'acknowledged',
    REJECTED: 'rejected',
    PENDING: 'pending',
    HELD: 'held',
    IN_PROGRESS: 'inProgress',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PARTIAL: 'partial',
    ASSESSING_CANCELLATION: 'assessingCancellation',
    PENDING_CANCELLATION: 'pendingCancellation'
  },
  
  // Product States
  PRODUCT_STATES: {
    CREATED: 'created',
    PENDING_ACTIVE: 'pendingActive',
    CANCELLED: 'cancelled',
    ACTIVE: 'active',
    PENDING_TERMINATE: 'pendingTerminate',
    TERMINATED: 'terminated',
    SUSPENDED: 'suspended',
    ABORTED: 'aborted'
  }
}