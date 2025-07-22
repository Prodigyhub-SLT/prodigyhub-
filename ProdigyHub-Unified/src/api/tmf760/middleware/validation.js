// backend/middleware/validation.js
const validateCheckProductConfiguration = (req, res, next) => {
  const { checkProductConfigurationItem } = req.body;
  
  if (!checkProductConfigurationItem || !Array.isArray(checkProductConfigurationItem)) {
    return res.status(400).json({
      error: 'checkProductConfigurationItem is required and must be an array'
    });
  }

  for (const item of checkProductConfigurationItem) {
    if (!item['@type'] || !item.id) {
      return res.status(400).json({
        error: 'Each checkProductConfigurationItem must have @type and id'
      });
    }
  }

  next();
};

const validateQueryProductConfiguration = (req, res, next) => {
  const { requestProductConfigurationItem } = req.body;
  
  if (!requestProductConfigurationItem || !Array.isArray(requestProductConfigurationItem)) {
    return res.status(400).json({
      error: 'requestProductConfigurationItem is required and must be an array'
    });
  }

  for (const item of requestProductConfigurationItem) {
    if (!item['@type'] || !item.id) {
      return res.status(400).json({
        error: 'Each requestProductConfigurationItem must have @type and id'
      });
    }
  }

  next();
};



