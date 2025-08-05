// src/config/cors.js
const corsConfig = {
  // Development CORS configuration
  development: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:8080',
      'http://localhost:5173',     // Add Vite default port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173',     // Add Vite localhost
      // Add your deployed frontend URLs here
      'https://your-frontend-domain.vercel.app',
      'https://your-frontend-domain.netlify.app',
      'https://your-frontend-domain.onrender.com'
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
      // Get allowed origins from environment variable with defaults
      const defaultOrigins = [
        'https://prodigyhub.onrender.com', // Your own domain
        'http://localhost:3000',           // Development
        'http://localhost:5173',           // Vite development
      ];
      
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : defaultOrigins;

      console.log('🔍 CORS Check - Origin:', origin);
      console.log('🔍 CORS Check - Allowed Origins:', allowedOrigins);

      // Allow requests with no origin (like mobile apps, Postman, or curl requests)
      if (!origin) {
        console.log('✅ CORS - No origin header, allowing request');
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        console.log('✅ CORS - Origin allowed:', origin);
        callback(null, true);
      } else {
        console.log('❌ CORS - Origin blocked:', origin);
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
  console.log(`📡 CORS origins:`, Array.isArray(config.origin) ? config.origin : 'Function-based');
  
  return config;
};

/**
 * Enhanced CORS middleware for TMF APIs
 */
const tmfCorsMiddleware = (req, res, next) => {
  // Set TMF-specific headers
  res.header('X-API-Version', 'v4-v5');
  res.header('X-TMF-Compliant', 'true');
  
  // Enhanced CORS headers for better browser compatibility
  const origin = req.headers.origin;
  
  // Set CORS headers explicitly
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Request-ID, X-API-Key');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Result-Count, X-Request-ID, X-API-Version');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS Preflight request from:', origin);
    res.header('Access-Control-Max-Age', '3600'); // Cache preflight for 1 hour
    return res.sendStatus(200);
  }
  
  console.log('🌐 CORS Request:', req.method, req.path, 'from:', origin);
  next();
};

/**
 * CORS error handler
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS')) {
    console.error('❌ CORS Error:', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      error: err.message
    });
    
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Cross-Origin Request Blocked',
      code: 'CORS_BLOCKED',
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      hint: 'Contact API administrator to whitelist your domain'
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
