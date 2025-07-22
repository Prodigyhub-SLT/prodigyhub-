// src/shared/constants/httpCodes.js
module.exports = {
  // Success codes
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server error codes
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  
  // Success messages
  SUCCESS_MESSAGES: {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    RETRIEVED: 'Resource retrieved successfully'
  },
  
  // Error messages
  ERROR_MESSAGES: {
    BAD_REQUEST: 'Bad Request',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Not Found',
    CONFLICT: 'Conflict',
    VALIDATION_ERROR: 'Validation Error',
    INTERNAL_ERROR: 'Internal Server Error',
    RATE_LIMIT_EXCEEDED: 'Too Many Requests'
  }
};