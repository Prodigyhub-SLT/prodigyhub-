// backend/utils/responseHelpers.js
const createSuccessResponse = (data, statusCode = 200) => {
  return {
    success: true,
    data,
    statusCode
  };
};

const createErrorResponse = (message, statusCode = 500, details = null) => {
  return {
    success: false,
    error: message,
    statusCode,
    details
  };
};

module.exports = {
  validateCheckProductConfiguration,
  validateQueryProductConfiguration,
  errorHandler,
  createSuccessResponse,
  createErrorResponse
};