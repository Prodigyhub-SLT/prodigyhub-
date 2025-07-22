// src/config/environment.js
require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // Security configuration
  security: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    trustProxy: process.env.TRUST_PROXY === 'true',
    enableHttps: process.env.ENABLE_HTTPS === 'true'
  },
  
  // API configuration
  apis: {
    enableTMF620: process.env.ENABLE_TMF620 !== 'false',
    enableTMF637: process.env.ENABLE_TMF637 !== 'false',
    enableTMF679: process.env.ENABLE_TMF679 !== 'false',
    enableTMF622: process.env.ENABLE_TMF622 !== 'false',
    enableTMF688: process.env.ENABLE_TMF688 !== 'false',
    enableTMF760: process.env.ENABLE_TMF760 !== 'false'
  },
  
  // Database configuration
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/prodigyhub',
    mongoTestUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/prodigyhub_test',
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
    serverSelectionTimeout: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
    socketTimeout: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'dev',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false'
  },
  
  // Performance configuration
  performance: {
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    compressionLevel: parseInt(process.env.COMPRESSION_LEVEL) || 6,
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false'
  },
  
  // Pagination configuration
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100,
    defaultOffset: parseInt(process.env.DEFAULT_OFFSET) || 0
  },
  
  // Feature flags
  features: {
    strictTmfValidation: process.env.STRICT_TMF_VALIDATION !== 'false',
    validateFieldSelection: process.env.VALIDATE_FIELD_SELECTION !== 'false',
    enableSchemaValidation: process.env.ENABLE_SCHEMA_VALIDATION !== 'false',
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableMockData: process.env.ENABLE_MOCK_DATA === 'true'
  },
  
  // Event configuration
  events: {
    enableEvents: process.env.ENABLE_EVENTS !== 'false',
    eventTimeout: parseInt(process.env.EVENT_TIMEOUT) || 30000,
    hubCallbackTimeout: parseInt(process.env.HUB_CALLBACK_TIMEOUT) || 10000,
    maxNotificationRetries: parseInt(process.env.MAX_NOTIFICATION_RETRIES) || 3
  }
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'server.port',
    'server.baseUrl'
  ];
  
  const missing = required.filter(path => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], config);
    return value === undefined || value === null;
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

// Validate configuration on load
validateConfig();

module.exports = config;