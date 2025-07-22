// src/api/tmf688/controllers/topicController.js
const { v4: uuidv4 } = require('uuid');

// Topic Model
class Topic {
  constructor(data) {
    this.id = data.id || uuidv4();
    this['@type'] = data['@type'] || 'Topic';
    this['@baseType'] = data['@baseType'] || 'topic';
    this['@schemaLocation'] = data['@schemaLocation'];
    this.href = data.href || `/tmf-api/event/v4/topic/${this.id}`;
    
    this.name = data.name;
    this.contentQuery = data.contentQuery;
    this.headerQuery = data.headerQuery;
  }

  isValid() {
    return this.name;
  }

  toJSON() {
    return {
      id: this.id,
      '@type': this['@type'],
      '@baseType': this['@baseType'],
      '@schemaLocation': this['@schemaLocation'],
      href: this.href,
      name: this.name,
      contentQuery: this.contentQuery,
      headerQuery: this.headerQuery
    };
  }
}

// In-memory storage
const topics = new Map();

// Helper functions
const helpers = {
  getAllTopics() {
    return Array.from(topics.values());
  },

  getTopicById(id) {
    return topics.get(id);
  },

  createTopic(topic) {
    topics.set(topic.id, topic);
    return topic;
  },

  deleteTopic(id) {
    return topics.delete(id);
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

// Topic Controller Class
class TopicController {
  getAllTopics(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const topicList = helpers.getAllTopics();
      const result = helpers.paginate(topicList, page, limit);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  getTopicById(req, res) {
    try {
      const { id } = req.params;
      const topic = helpers.getTopicById(id);
      
      if (!topic) {
        return res.status(404).json({ 
          error: 'Topic not found', 
          message: `Topic with id ${id} does not exist` 
        });
      }
      
      res.json(topic.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  createTopic(req, res) {
    try {
      const topicData = req.body;
      const topic = new Topic(topicData);
      
      if (!topic.isValid()) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'name is required' 
        });
      }
      
      const createdTopic = helpers.createTopic(topic);
      res.status(201).json(createdTopic.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  deleteTopic(req, res) {
    try {
      const { id } = req.params;
      const deleted = helpers.deleteTopic(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Topic not found', 
          message: `Topic with id ${id} does not exist` 
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

module.exports = TopicController;
