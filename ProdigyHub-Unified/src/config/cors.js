// src/config/cors.js
const corsConfig = {
  // Development CORS configuration
  development: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept',
      'Origin',
      'X-Request-ID',
      'X-API-Key'
    ],
    exposedHeaders: [
      'X-Total-Count', 
      'X-Result-Count', 
      'X-Request-ID',
      'X-API-Version'
    ],
    optionsSuccessStatus: 200,
    preflightContinue: false
  },

  // Production CORS configuration
  production: {
    origin: function (origin, callback) {
      // Get allowed origins from environment variable
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : [];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept',
      'Origin',
      'X-Request-ID',
      'X-API-Key'
    ],
    exposedHeaders: [
      'X-Total-Count', 
      'X-Result-Count', 
      'X-Request-ID',
      'X-API-Version'
    ],
    optionsSuccessStatus: 200,
    preflightContinue: false
  },

  // Test CORS configuration
  test: {
    origin: true, // Allow all origins in test
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept',
      'Origin',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count', 
      'X-Result-Count', 
      'X-Request-ID'
    ]
  }
};

/**
 * Get CORS configuration based on environment
 */
const getCorsConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const config = corsConfig[env] || corsConfig.development;
  
  console.log(`📡 CORS configured for environment: ${env}`);
  
  return config;
};

/**
 * Enhanced CORS middleware for TMF APIs
 */
const tmfCorsMiddleware = (req, res, next) => {
  // Set TMF-specific headers
  res.header('X-API-Version', 'v4-v5');
  res.header('X-TMF-Compliant', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Request-ID');
    res.header('Access-Control-Max-Age', '3600'); // Cache preflight for 1 hour
    return res.sendStatus(200);
  }
  
  next();
};

/**
 * CORS error handler
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Cross-Origin Request Blocked',
      code: 'CORS_BLOCKED',
      origin: req.headers.origin,
      method: req.method,
      path: req.path
    });
  }
  next(err);
};

module.exports = {
  corsConfig,
  getCorsConfig,
  tmfCorsMiddleware,
  corsErrorHandler
};