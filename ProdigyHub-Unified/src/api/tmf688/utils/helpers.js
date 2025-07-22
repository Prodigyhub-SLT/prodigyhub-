// In-memory storage
const storage = {
  events: new Map(),
  topics: new Map(),
  hubs: new Map()
};

// Helper functions
const helpers = {
  // Event helpers
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

  // Topic helpers
  getAllTopics() {
    return Array.from(storage.topics.values());
  },

  getTopicById(id) {
    return storage.topics.get(id);
  },

  createTopic(topic) {
    storage.topics.set(topic.id, topic);
    return topic;
  },

  deleteTopic(id) {
    return storage.topics.delete(id);
  },

  // Hub helpers
  getAllHubs() {
    return Array.from(storage.hubs.values());
  },

  getHubById(id) {
    return storage.hubs.get(id);
  },

  createHub(hub) {
    storage.hubs.set(hub.id, hub);
    return hub;
  },

  deleteHub(id) {
    return storage.hubs.delete(id);
  },

  // Filter helpers
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

  // Pagination helper
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

module.exports = helpers;