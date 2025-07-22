const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

/**
 * Security middleware
 */
const securityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

/**
 * CORS middleware
 */
const corsMiddleware = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:3001'];

  return cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Result-Count']
  });
};

/**
 * Rate limiting middleware
 */
const rateLimitMiddleware = () => {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

/**
 * Request logging middleware
 */
const loggingMiddleware = () => {
  const format = process.env.NODE_ENV === 'production' 
    ? 'combined' 
    : 'dev';
  
  return morgan(format, {
    skip: (req, res) => {
      // Skip logging for health checks in production
      return process.env.NODE_ENV === 'production' && 
             (req.path === '/health' || req.path === '/api/health');
    }
  });
};

/**
 * Compression middleware
 */
const compressionMiddleware = () => {
  return compression({
    filter: (req, res) => {
      // Don't compress responses if the client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression filter function
      return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is good balance)
    threshold: 1024, // Only compress responses larger than 1KB
  });
};

/**
 * Request timeout middleware
 */
const timeoutMiddleware = (timeout = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      const err = new Error('Request Timeout');
      err.status = 408;
      err.code = 'REQUEST_TIMEOUT';
      next(err);
    });
    next();
  };
};

/**
 * Request ID middleware
 */
const requestIdMiddleware = () => {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || require('uuid').v4();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  };
};

/**
 * Global error handler middleware
 */
const errorHandlerMiddleware = () => {
  return (err, req, res, next) => {
    // Log error
    console.error(`[${req.requestId}] Error:`, {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Handle specific error types
    let statusCode = err.status || err.statusCode || 500;
    let errorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      requestId: req.requestId
    };

    // Validation errors
    if (err.name === 'ValidationError') {
      statusCode = 400;
      errorResponse = {
        error: 'Bad Request',
        message: err.message,
        code: 'VALIDATION_ERROR',
        requestId: req.requestId
      };
    }

    // MongoDB cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
      statusCode = 400;
      errorResponse = {
        error: 'Bad Request',
        message: 'Invalid ID format',
        code: 'INVALID_ID_FORMAT',
        requestId: req.requestId
      };
    }

    // MongoDB duplicate key errors
    if (err.code === 11000) {
      statusCode = 409;
      errorResponse = {
        error: 'Conflict',
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        requestId: req.requestId
      };
    }

    // CORS errors
    if (err.message && err.message.includes('CORS')) {
      statusCode = 403;
      errorResponse = {
        error: 'Forbidden',
        message: 'CORS policy violation',
        code: 'CORS_ERROR',
        requestId: req.requestId
      };
    }

    // Timeout errors
    if (err.code === 'REQUEST_TIMEOUT') {
      statusCode = 408;
      errorResponse = {
        error: 'Request Timeout',
        message: 'Request took too long to process',
        code: 'REQUEST_TIMEOUT',
        requestId: req.requestId
      };
    }

    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      errorResponse.message = 'An unexpected error occurred';
    } else if (statusCode === 500) {
      errorResponse.message = err.message;
    }

    res.status(statusCode).json(errorResponse);
  };
};

/**
 * 404 Not Found handler
 */
const notFoundMiddleware = () => {
  return (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      requestId: req.requestId
    });
  };
};

/**
 * Health check middleware
 */
const healthCheckMiddleware = () => {
  return (req, res) => {
    const database = require('../config/database');
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: database.isConnected(),
        state: database.getConnectionState()
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    });
  };
};

module.exports = {
  securityMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  loggingMiddleware,
  compressionMiddleware,
  timeoutMiddleware,
  requestIdMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
  healthCheckMiddleware
};