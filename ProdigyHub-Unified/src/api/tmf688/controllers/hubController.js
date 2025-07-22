// src/api/tmf688/controllers/hubController.js
const { v4: uuidv4 } = require('uuid');

// Hub Model
class Hub {
  constructor(data) {
    this.id = data.id || uuidv4();
    this['@type'] = data['@type'] || 'Hub';
    this['@baseType'] = data['@baseType'] || 'hub';
    this['@schemaLocation'] = data['@schemaLocation'];
    this.href = data.href || `/tmf-api/event/v4/hub/${this.id}`;
    
    this.callback = data.callback;
    this.query = data.query;
  }

  isValid() {
    return this.callback;
  }

  toJSON() {
    return {
      id: this.id,
      '@type': this['@type'],
      '@baseType': this['@baseType'],
      '@schemaLocation': this['@schemaLocation'],
      href: this.href,
      callback: this.callback,
      query: this.query
    };
  }
}

// In-memory storage
const hubs = new Map();

// Helper functions
const helpers = {
  getAllHubs() {
    return Array.from(hubs.values());
  },

  getHubById(id) {
    return hubs.get(id);
  },

  createHub(hub) {
    hubs.set(hub.id, hub);
    return hub;
  },

  deleteHub(id) {
    return hubs.delete(id);
  },

  paginate(array, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: array.length,
        totalPages: Math.ceil(array.length / limit)
      }
    };
  }
};

// Hub Controller Class
class HubController {
  getAllHubs(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const hubList = helpers.getAllHubs();
      const result = helpers.paginate(hubList, page, limit);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  getHubById(req, res) {
    try {
      const { id } = req.params;
      const hub = helpers.getHubById(id);
      
      if (!hub) {
        return res.status(404).json({ 
          error: 'Hub not found', 
          message: `Hub with id ${id} does not exist` 
        });
      }
      
      res.json(hub.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  createHub(req, res) {
    try {
      const hubData = req.body;
      const hub = new Hub(hubData);
      
      if (!hub.isValid()) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'callback is required' 
        });
      }
      
      const createdHub = helpers.createHub(hub);
      res.status(201).json(createdHub.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  deleteHub(req, res) {
    try {
      const { id } = req.params;
      const deleted = helpers.deleteHub(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Hub not found', 
          message: `Hub with id ${id} does not exist` 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }
}

module.exports = HubController;