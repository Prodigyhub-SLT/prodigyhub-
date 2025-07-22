// src/shared/middleware/errorHandler.js
const logger = require('../utils/logger');

/**
 * Development error handler - includes stack traces
 */
const developmentErrorHandler = (err, req, res, next) => {
  const error = {
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  // Log error details
  logger.error('Development Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    requestId: req.requestId
  });

  res.status(error.status).json(error);
};

/**
 * Production error handler - sanitized responses
 */
const productionErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // Log error for monitoring
  logger.error('Production Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
    requestId: req.requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Prepare sanitized error response
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  // Handle specific error types
  if (statusCode < 500) {
    // Client errors (4xx) - safe to expose
    errorResponse = {
      error: err.name || 'Client Error',
      message: err.message || 'Bad Request',
      code: err.code || 'CLIENT_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * TMF-compliant error handler
 */
const tmfErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // TMF-compliant error structure
  const tmfError = {
    '@type': 'Error',
    code: statusCode.toString(),
    reason: getReasonFromStatus(statusCode),
    message: err.message || 'An error occurred',
    status: statusCode.toString(),
    timestamp: new Date().toISOString()
  };

  // Add reference error if available
  if (err.referenceError) {
    tmfError.referenceError = err.referenceError;
  }

  // Add request ID for debugging
  if (req.requestId) {
    tmfError.requestId = req.requestId;
  }

  // Log error
  logger.error('TMF Error:', {
    ...tmfError,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json(tmfError);
};

/**
 * Validation error handler
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.name !== 'ValidationError') {
    return next(err);
  }

  const validationErrors = [];
  
  if (err.details) {
    // Joi validation errors
    validationErrors.push(...err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    })));
  } else if (err.errors) {
    // Mongoose validation errors
    Object.values(err.errors).forEach(error => {
      validationErrors.push({
        field: error.path,
        message: error.message,
        value: error.value
      });
    });
  }

  const errorResponse = {
    '@type': 'Error',
    code: '400',
    reason: 'Bad Request',
    message: 'Validation failed',
    validationErrors,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  logger.warn('Validation Error:', {
    ...errorResponse,
    path: req.path,
    method: req.method,
    body: req.body
  });

  res.status(400).json(errorResponse);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  const error = {
    '@type': 'Error',
    code: '404',
    reason: 'Not Found',
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  logger.warn('Resource Not Found:', {
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(404).json(error);
};

/**
 * Async error wrapper
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler setup
 */
const setupErrorHandling = (app) => {
  // Handle validation errors first
  app.use(validationErrorHandler);
  
  // Main error handler based on environment
  if (process.env.NODE_ENV === 'production') {
    app.use(tmfErrorHandler);
    app.use(productionErrorHandler);
  } else {
    app.use(tmfErrorHandler);
    app.use(developmentErrorHandler);
  }
  
  // 404 handler (must be last)
  app.use('*', notFoundHandler);
  
  console.log('✅ Error handling middleware configured');
};

/**
 * Get reason text from HTTP status code
 */
const getReasonFromStatus = (statusCode) => {
  const reasons = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  
  return reasons[statusCode] || 'Unknown Error';
};

/**
 * Create custom error
 */
const createError = (message, statusCode = 500, code = null) => {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

module.exports = {
  developmentErrorHandler,
  productionErrorHandler,
  tmfErrorHandler,
  validationErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  setupErrorHandling,
  createError
};