const validation = {
  validateEvent: (req, res, next) => {
    const { eventType, event } = req.body;
    
    if (!eventType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'eventType is required'
      });
    }
    
    if (!event) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'event payload is required'
      });
    }
    
    next();
  },

  validateTopic: (req, res, next) => {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'name is required'
      });
    }
    
    next();
  },

  validateHub: (req, res, next) => {
    const { callback } = req.body;
    
    if (!callback) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'callback is required'
      });
    }
    
    next();
  }
};

module.exports = validation;