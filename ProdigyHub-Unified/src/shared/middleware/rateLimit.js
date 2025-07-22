// src/shared/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const config = require('../../config/environment');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.security.rateLimitWindowMs,
    max: options.max || config.security.rateLimitMaxRequests,
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || 
             req.path.includes('/health') ||
             req.path === '/';
    },
    keyGenerator: (req) => {
      // Use X-Forwarded-For if behind proxy, otherwise use remote address
      return req.ip || req.connection.remoteAddress;
    },
    onLimitReached: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    },
    ...options
  });
};

// Different rate limiters for different purposes
const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    error: 'API Rate Limit Exceeded',
    message: 'Too many API requests, please slow down.',
    code: 'API_RATE_LIMIT'
  }
});

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 auth attempts per window
  message: {
    error: 'Authentication Rate Limit Exceeded',
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT'
  }
});

const strictRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Strict Rate Limit Exceeded',
    message: 'Rate limit exceeded for sensitive operations.',
    code: 'STRICT_RATE_LIMIT'
  }
});

module.exports = {
  createRateLimiter,
  apiRateLimit,
  authRateLimit,
  strictRateLimit
};