const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    status: err.status || 500,
    message: err.message || 'Internal Server Error'
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = err.details;
  }

  // Send error response
  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(error.details && { details: error.details })
  });
};

module.exports = errorHandler;