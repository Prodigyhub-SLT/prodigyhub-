const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Product Order Reference schema
const ProductOrderRefSchema = new mongoose.Schema({
  href: String,
  id: { type: String, required: true },
  name: String,
  '@type': { type: String, default: 'ProductOrderRef' },
  '@referredType': { type: String, default: 'ProductOrder' }
}, { _id: false });

// Cancel Product Order Schema
const CancelProductOrderSchema = new mongoose.Schema({
  id: { 
    type: String, 
    default: uuidv4,
    unique: true,
    required: true 
  },
  href: String,
  
  // Cancellation details
  cancellationReason: String,
  requestedCancellationDate: Date,
  effectiveCancellationDate: Date,
  
  // Dates
  creationDate: { type: Date, default: Date.now },
  
  // State management
  state: { 
    type: String, 
    enum: ['acknowledged', 'inProgress', 'terminatedWithErrors', 'done'],
    default: 'acknowledged'
  },
  
  // References
  productOrder: { 
    type: ProductOrderRefSchema, 
    required: true 
  },
  
  // TMF metadata
  '@baseType': String,
  '@schemaLocation': String,
  '@type': { type: String, default: 'CancelProductOrder' }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
CancelProductOrderSchema.index({ id: 1 });
CancelProductOrderSchema.index({ 'productOrder.id': 1 });
CancelProductOrderSchema.index({ state: 1 });
CancelProductOrderSchema.index({ creationDate: -1 });

// Generate href before saving
CancelProductOrderSchema.pre('save', function(next) {
  if (!this.href && this.id) {
    this.href = `${process.env.BASE_PATH || '/productOrderingManagement'}/${process.env.API_VERSION || 'v4'}/cancelProductOrder/${this.id}`;
  }
  next();
});

// Instance methods
CancelProductOrderSchema.methods.toTMFFormat = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

module.exports = mongoose.model('CancelProductOrder', CancelProductOrderSchema);