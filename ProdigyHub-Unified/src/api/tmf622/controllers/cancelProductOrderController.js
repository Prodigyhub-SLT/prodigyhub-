const CancelProductOrder = require('../models/CancelProductOrder');
const ProductOrder = require('../models/ProductOrder');
const { CancelProductOrderCreateSchema, CancelProductOrderQuerySchema } = require('../validation/schemas');

class CancelProductOrderController {
  
  /**
   * List or find CancelProductOrder objects
   * GET /productOrderingManagement/v4/cancelProductOrder
   */
  async listCancelProductOrders(req, res) {
    try {
      // Validate query parameters
      const { error, value: queryParams } = CancelProductOrderQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.details[0].message,
          code: 'INVALID_QUERY_PARAMETERS'
        });
      }

      const { fields, offset, limit, ...filters } = queryParams;
      
      // Build MongoDB filter
      const mongoFilter = this._buildMongoFilter(filters);
      
      // Build field selection
      let fieldSelection = {};
      if (fields) {
        const selectedFields = fields.split(',').reduce((acc, field) => {
          acc[field.trim()] = 1;
          return acc;
        }, {});
        fieldSelection = selectedFields;
      }

      // Execute query with pagination
      const [cancelOrders, totalCount] = await Promise.all([
        CancelProductOrder.find(mongoFilter)
          .select(fieldSelection)
          .skip(offset)
          .limit(limit)
          .sort({ creationDate: -1 })
          .lean(),
        CancelProductOrder.countDocuments(mongoFilter)
      ]);

      // Format response according to TMF format
      const formattedOrders = cancelOrders.map(order => this._formatResponse(order));

      // Add pagination headers
      res.set({
        'X-Total-Count': totalCount.toString(),
        'X-Result-Count': formattedOrders.length.toString()
      });

      res.status(200).json(formattedOrders);
    } catch (error) {
      console.error('Error listing cancel product orders:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve cancel product orders',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Retrieve a CancelProductOrder by ID
   * GET /productOrderingManagement/v4/cancelProductOrder/{id}
   */
  async getCancelProductOrderById(req, res) {
    try {
      const { id } = req.params;
      const { fields } = req.query;

      // Build field selection
      let fieldSelection = {};
      if (fields) {
        const selectedFields = fields.split(',').reduce((acc, field) => {
          acc[field.trim()] = 1;
          return acc;
        }, {});
        fieldSelection = selectedFields;
      }

      const cancelOrder = await CancelProductOrder.findOne({ id })
        .select(fieldSelection)
        .lean();

      if (!cancelOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: `CancelProductOrder with id '${id}' not found`,
          code: 'NOT_FOUND'
        });
      }

      const formattedOrder = this._formatResponse(cancelOrder);
      res.status(200).json(formattedOrder);
    } catch (error) {
      console.error('Error retrieving cancel product order:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve cancel product order',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Create a CancelProductOrder
   * POST /productOrderingManagement/v4/cancelProductOrder
   */
  async createCancelProductOrder(req, res) {
    try {
      // Validate request body
      const { error, value: validatedData } = CancelProductOrderCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.details[0].message,
          code: 'INVALID_REQUEST_DATA'
        });
      }

      // Validate that the referenced product order exists and can be cancelled
      const productOrder = await ProductOrder.findOne({ id: validatedData.productOrder.id });
      if (!productOrder) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Referenced ProductOrder with id '${validatedData.productOrder.id}' not found`,
          code: 'INVALID_PRODUCT_ORDER_REFERENCE'
        });
      }

      // Check if the product order can be cancelled
      const cancellationValidationError = this._validateCancellationEligibility(productOrder);
      if (cancellationValidationError) {
        return res.status(400).json({
          error: 'Bad Request',
          message: cancellationValidationError,
          code: 'CANCELLATION_NOT_ALLOWED'
        });
      }

      // Check if there's already a pending cancellation request
      const existingCancelRequest = await CancelProductOrder.findOne({
        'productOrder.id': validatedData.productOrder.id,
        state: { $in: ['acknowledged', 'inProgress'] }
      });

      if (existingCancelRequest) {
        return res.status(409).json({
          error: 'Conflict',
          message: `A cancellation request already exists for ProductOrder '${validatedData.productOrder.id}'`,
          code: 'CANCELLATION_REQUEST_EXISTS'
        });
      }

      // Enhance the product order reference with additional details
      validatedData.productOrder.href = productOrder.href;
      validatedData.productOrder.name = productOrder.description || `Order ${productOrder.id}`;

      // Create new cancel product order
      const cancelProductOrder = new CancelProductOrder(validatedData);
      await cancelProductOrder.save();

      // Update the original product order status
      await ProductOrder.findOneAndUpdate(
        { id: productOrder.id },
        { 
          $set: { 
            state: 'assessingCancellation',
            cancellationReason: validatedData.cancellationReason,
            cancellationDate: validatedData.requestedCancellationDate
          }
        }
      );

      // Emit events
      this._emitCancelProductOrderEvent('CancelProductOrderCreateEvent', cancelProductOrder);
      this._emitProductOrderEvent('ProductOrderStateChangeEvent', {
        id: productOrder.id,
        state: 'assessingCancellation'
      });

      const formattedOrder = this._formatResponse(cancelProductOrder.toObject());
      res.status(201).json(formattedOrder);
    } catch (error) {
      console.error('Error creating cancel product order:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'CancelProductOrder with this ID already exists',
          code: 'DUPLICATE_ID'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create cancel product order',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Process cancel product order (internal method for workflow)
   * This would typically be called by a background job or workflow engine
   */
  async processCancelProductOrder(cancelOrderId) {
    try {
      const cancelOrder = await CancelProductOrder.findOne({ id: cancelOrderId });
      if (!cancelOrder) {
        throw new Error(`CancelProductOrder ${cancelOrderId} not found`);
      }

      // Update cancel order state to in progress
      cancelOrder.state = 'inProgress';
      await cancelOrder.save();

      // Simulate cancellation assessment logic
      const productOrder = await ProductOrder.findOne({ id: cancelOrder.productOrder.id });
      
      if (!productOrder) {
        cancelOrder.state = 'terminatedWithErrors';
        await cancelOrder.save();
        return;
      }

      // Determine if cancellation is approved based on business rules
      const canCancel = this._assessCancellationRequest(productOrder, cancelOrder);
      
      if (canCancel) {
        // Approve cancellation
        cancelOrder.state = 'done';
        cancelOrder.effectiveCancellationDate = new Date();
        await cancelOrder.save();

        // Update product order to cancelled
        productOrder.state = 'cancelled';
        productOrder.cancellationDate = cancelOrder.effectiveCancellationDate;
        productOrder.cancellationReason = cancelOrder.cancellationReason;
        await productOrder.save();

        // Emit events
        this._emitCancelProductOrderEvent('CancelProductOrderStateChangeEvent', cancelOrder);
        this._emitProductOrderEvent('ProductOrderStateChangeEvent', productOrder);
      } else {
        // Reject cancellation - return order to previous state
        cancelOrder.state = 'done';
        await cancelOrder.save();

        // Return product order to in progress or appropriate state
        productOrder.state = 'inProgress'; // or determine appropriate state
        await productOrder.save();

        // Emit events
        this._emitCancelProductOrderEvent('CancelProductOrderStateChangeEvent', cancelOrder);
        this._emitProductOrderEvent('ProductOrderStateChangeEvent', productOrder);
      }

    } catch (error) {
      console.error('Error processing cancel product order:', error);
      
      // Update cancel order to error state
      try {
        await CancelProductOrder.findOneAndUpdate(
          { id: cancelOrderId },
          { state: 'terminatedWithErrors' }
        );
      } catch (updateError) {
        console.error('Error updating cancel order state to error:', updateError);
      }
    }
  }

  /**
   * Build MongoDB filter from query parameters
   */
  _buildMongoFilter(filters) {
    const mongoFilter = {};

    // State filter
    if (filters.state) {
      mongoFilter.state = filters.state;
    }

    // Product order ID filter
    if (filters['productOrder.id']) {
      mongoFilter['productOrder.id'] = filters['productOrder.id'];
    }

    // Date range filters
    if (filters['creationDate.gte'] || filters['creationDate.lte']) {
      mongoFilter.creationDate = {};
      if (filters['creationDate.gte']) {
        mongoFilter.creationDate.$gte = new Date(filters['creationDate.gte']);
      }
      if (filters['creationDate.lte']) {
        mongoFilter.creationDate.$lte = new Date(filters['creationDate.lte']);
      }
    }

    return mongoFilter;
  }

  /**
   * Format response according to TMF format
   */
  _formatResponse(cancelOrder) {
    const formatted = { ...cancelOrder };
    
    // Remove MongoDB specific fields
    delete formatted._id;
    delete formatted.__v;
    delete formatted.createdAt;
    delete formatted.updatedAt;

    return formatted;
  }

  /**
   * Validate if a product order can be cancelled
   */
  _validateCancellationEligibility(productOrder) {
    // Orders that cannot be cancelled
    const nonCancellableStates = ['completed', 'cancelled', 'failed'];
    if (nonCancellableStates.includes(productOrder.state)) {
      return `ProductOrder in state '${productOrder.state}' cannot be cancelled`;
    }

    // Check if order is already being cancelled
    if (productOrder.state === 'assessingCancellation' || productOrder.state === 'pendingCancellation') {
      return `ProductOrder is already in cancellation process with state '${productOrder.state}'`;
    }

    // Additional business rules can be added here
    // For example: check if order has passed point of no return (PONR)
    
    return null; // No validation errors
  }

  /**
   * Assess cancellation request based on business rules
   */
  _assessCancellationRequest(productOrder, cancelOrder) {
    // Simple business logic for demo - in reality this would be more complex
    
    // If order is still in early stages, allow cancellation
    if (['acknowledged', 'pending'].includes(productOrder.state)) {
      return true;
    }

    // If order is in progress, check how long it's been processing
    if (productOrder.state === 'inProgress') {
      const daysSinceCreation = (new Date() - new Date(productOrder.creationDate)) / (1000 * 60 * 60 * 24);
      
      // Allow cancellation if order was created less than 7 days ago
      if (daysSinceCreation < 7) {
        return true;
      }
    }

    // Check if it's a high-priority cancellation with valid reason
    if (cancelOrder.cancellationReason && 
        (cancelOrder.cancellationReason.toLowerCase().includes('urgent') ||
         cancelOrder.cancellationReason.toLowerCase().includes('error'))) {
      return true;
    }

    // Default: reject cancellation for orders that have progressed too far
    return false;
  }

  /**
   * Emit cancel product order events
   */
  _emitCancelProductOrderEvent(eventType, cancelOrderData) {
    console.log(`📢 Event emitted: ${eventType}`, {
      eventId: require('uuid').v4(),
      eventTime: new Date().toISOString(),
      eventType,
      cancelProductOrder: {
        id: cancelOrderData.id,
        href: cancelOrderData.href,
        state: cancelOrderData.state,
        productOrder: cancelOrderData.productOrder
      }
    });
  }

  /**
   * Emit product order events
   */
  _emitProductOrderEvent(eventType, orderData) {
    console.log(`📢 Event emitted: ${eventType}`, {
      eventId: require('uuid').v4(),
      eventTime: new Date().toISOString(),
      eventType,
      productOrder: {
        id: orderData.id,
        href: orderData.href,
        state: orderData.state
      }
    });
  }
}

module.exports = new CancelProductOrderController();