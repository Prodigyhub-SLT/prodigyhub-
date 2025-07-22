// src/api/tmf688/controllers/eventController.js
const { v4: uuidv4 } = require('uuid');

// In-memory storage
const storage = {
  events: new Map(),
  topics: new Map(),
  hubs: new Map()
};

// Event Model
class Event {
  constructor(data) {
    this.id = data.id || uuidv4();
    this['@type'] = data['@type'] || 'Event';
    this['@baseType'] = data['@baseType'] || 'event';
    this['@schemaLocation'] = data['@schemaLocation'];
    this.href = data.href || `/tmf-api/event/v4/event/${this.id}`;
    
    this.eventId = data.eventId || uuidv4();
    this.eventTime = data.eventTime || new Date().toISOString();
    this.eventType = data.eventType;
    this.correlationId = data.correlationId;
    this.domain = data.domain;
    this.title = data.title;
    this.description = data.description;
    this.timeOccurred = data.timeOccurred || new Date().toISOString();
    this.priority = data.priority || 'Normal';
    
    this.source = data.source;
    this.reportingSystem = data.reportingSystem;
    this.relatedParty = data.relatedParty || [];
    this.event = data.event;
    this.analyticCharacteristic = data.analyticCharacteristic || [];
  }

  isValid() {
    return this.eventType && this.event;
  }

  toJSON() {
    return {
      id: this.id,
      '@type': this['@type'],
      '@baseType': this['@baseType'],
      '@schemaLocation': this['@schemaLocation'],
      href: this.href,
      eventId: this.eventId,
      eventTime: this.eventTime,
      eventType: this.eventType,
      correlationId: this.correlationId,
      domain: this.domain,
      title: this.title,
      description: this.description,
      timeOccurred: this.timeOccurred,
      priority: this.priority,
      source: this.source,
      reportingSystem: this.reportingSystem,
      relatedParty: this.relatedParty,
      event: this.event,
      analyticCharacteristic: this.analyticCharacteristic
    };
  }
}

// Helper functions
const helpers = {
  getAllEvents() {
    return Array.from(storage.events.values());
  },

  getEventById(id) {
    return storage.events.get(id);
  },

  createEvent(event) {
    storage.events.set(event.id, event);
    return event;
  },

  updateEvent(id, updates) {
    const event = storage.events.get(id);
    if (event) {
      Object.assign(event, updates);
      storage.events.set(id, event);
    }
    return event;
  },

  deleteEvent(id) {
    return storage.events.delete(id);
  },

  filterEvents(events, filters) {
    let filtered = events;

    if (filters.eventType) {
      filtered = filtered.filter(event => 
        event.eventType?.toLowerCase().includes(filters.eventType.toLowerCase())
      );
    }

    if (filters.domain) {
      filtered = filtered.filter(event => 
        event.domain?.toLowerCase().includes(filters.domain.toLowerCase())
      );
    }

    if (filters.priority) {
      filtered = filtered.filter(event => 
        event.priority?.toLowerCase() === filters.priority.toLowerCase()
      );
    }

    return filtered;
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

// Event Controller Class
class EventController {
  getAllEvents(req, res) {
    try {
      const { eventType, domain, priority, page = 1, limit = 10 } = req.query;
      
      let events = helpers.getAllEvents();
      
      if (eventType || domain || priority) {
        events = helpers.filterEvents(events, { eventType, domain, priority });
      }
      
      const result = helpers.paginate(events, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = helpers.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ 
          error: 'Event not found', 
          message: `Event with id ${id} does not exist` 
        });
      }
      
      res.json(event.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  createEvent(req, res) {
    try {
      const eventData = req.body;
      const event = new Event(eventData);
      
      if (!event.isValid()) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'eventType and event payload are required' 
        });
      }
      
      const createdEvent = helpers.createEvent(event);
      res.status(201).json(createdEvent.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  updateEvent(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedEvent = helpers.updateEvent(id, updates);
      
      if (!updatedEvent) {
        return res.status(404).json({ 
          error: 'Event not found', 
          message: `Event with id ${id} does not exist` 
        });
      }
      
      res.json(updatedEvent.toJSON());
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }

  deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const deleted = helpers.deleteEvent(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Event not found', 
          message: `Event with id ${id} does not exist` 
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

module.exports = EventController;