// src/shared/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Basic authentication middleware (placeholder for future implementation)
 */
const authenticate = (req, res, next) => {
  // For development, skip authentication
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    req.user = {
      id: 'dev-user',
      role: 'admin',
      name: 'Development User'
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization header provided',
      code: 'MISSING_AUTH_HEADER'
    });
  }

  try {
    // Support Bearer token format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // Verify JWT token (if JWT_SECRET is provided)
    if (process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    }

    // Basic API key validation (if API_KEYS is provided)
    if (process.env.API_KEYS) {
      const validKeys = process.env.API_KEYS.split(',');
      if (validKeys.includes(token)) {
        req.user = {
          id: 'api-user',
          role: 'api',
          apiKey: token
        };
        return next();
      }
    }

    // If no secret configured, allow requests in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ No JWT_SECRET or API_KEYS configured. Allowing request in development mode.');
      req.user = {
        id: 'unauth-user',
        role: 'guest'
      };
      return next();
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });

  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid JWT token',
        code: 'INVALID_JWT'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'JWT token has expired',
        code: 'EXPIRED_JWT'
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Authorization middleware to check user roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    // Skip authorization in development if configured
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Allow if no specific roles required
    if (!roles || roles.length === 0) {
      return next();
    }

    // Check if user has required role
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${roles.join(', ')}. User role: ${userRole}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next(); // Continue without user
  }

  try {
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors for optional auth
    console.debug('Optional auth failed:', error.message);
  }

  next();
};

/**
 * API key authentication middleware
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }

  // Validate API key
  if (process.env.API_KEYS) {
    const validKeys = process.env.API_KEYS.split(',');
    if (!validKeys.includes(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }
  } else if (process.env.NODE_ENV !== 'development') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'API key validation not configured',
      code: 'AUTH_CONFIG_ERROR'
    });
  }

  req.apiKey = apiKey;
  req.user = {
    id: 'api-user',
    role: 'api',
    apiKey: apiKey
  };

  next();
};

/**
 * Generate JWT token (utility function)
 */
const generateToken = (payload, expiresIn = '24h') => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token (utility function)
 */
const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  apiKeyAuth,
  generateToken,
  verifyToken
};
