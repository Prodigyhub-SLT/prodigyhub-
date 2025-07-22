// src/shared/middleware/cors.js
const cors = require('cors');
const { getCorsConfig, tmfCorsMiddleware, corsErrorHandler } = require('../../config/cors');

/**
 * Setup CORS middleware with TMF enhancements
 */
const setupCors = (app) => {
  // Get CORS configuration based on environment
  const corsConfig = getCorsConfig();
  
  // Apply CORS middleware
  app.use(cors(corsConfig));
  
  // Add TMF-specific CORS handling
  app.use(tmfCorsMiddleware);
  
  // Add CORS error handler
  app.use(corsErrorHandler);
  
  console.log('✅ CORS middleware configured');
};

/**
 * Custom CORS middleware for specific routes
 */
const customCors = (options = {}) => {
  const defaultConfig = getCorsConfig();
  const mergedConfig = { ...defaultConfig, ...options };
  
  return cors(mergedConfig);
};

/**
 * Strict CORS for sensitive operations
 */
const strictCors = () => {
  return cors({
    origin: process.env.STRICT_CORS_ORIGINS?.split(',') || ['https://app.prodigyhub.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 300 // 5 minutes cache
  });
};

/**
 * Public CORS for public APIs
 */
const publicCors = () => {
  return cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
    maxAge: 3600 // 1 hour cache
  });
};

module.exports = {
  setupCors,
  customCors,
  strictCors,
  publicCors
};