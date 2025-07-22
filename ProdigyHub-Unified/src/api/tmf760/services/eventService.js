// backend/services/eventService.js
const EventEmitter = require('events');

class ProductConfigurationEventService extends EventEmitter {
  constructor() {
    super();
    this.listeners = new Map();
  }

  // Register event listener (TMF688 compliant)
  registerListener(listenerId, callbackUrl, query = '') {
    this.listeners.set(listenerId, {
      id: listenerId,
      callback: callbackUrl,
      query: query,
      registeredAt: new Date().toISOString()
    });
    
    console.log(`Event listener registered: ${listenerId} -> ${callbackUrl}`);
    return this.listeners.get(listenerId);
  }

  // Unregister event listener
  unregisterListener(listenerId) {
    const removed = this.listeners.delete(listenerId);
    console.log(`Event listener unregistered: ${listenerId}`);
    return removed;
  }

  // Get all registered listeners
  getListeners() {
    return Array.from(this.listeners.values());
  }

  // Emit product configuration events
  emitCheckProductConfigurationEvent(eventType, configuration) {
    const event = {
      eventId: this.generateEventId(),
      eventTime: new Date().toISOString(),
      eventType: `CheckProductConfiguration${eventType}Event`,
      event: {
        checkProductConfiguration: configuration
      }
    };

    this.emit('productConfigurationEvent', event);
    this.notifyListeners(event);
    
    return event;
  }

  emitQueryProductConfigurationEvent(eventType, configuration) {
    const event = {
      eventId: this.generateEventId(),
      eventTime: new Date().toISOString(),
      eventType: `QueryProductConfiguration${eventType}Event`,
      event: {
        queryProductConfiguration: configuration
      }
    };

    this.emit('productConfigurationEvent', event);
    this.notifyListeners(event);
    
    return event;
  }

  // Notify all registered listeners
  async notifyListeners(event) {
    const notifications = [];
    
    for (const listener of this.listeners.values()) {
      try {
        // In a real implementation, you would make HTTP POST requests to listener callbacks
        console.log(`Notifying listener ${listener.id}: ${listener.callback}`);
        notifications.push({
          listenerId: listener.id,
          status: 'sent',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to notify listener ${listener.id}:`, error);
        notifications.push({
          listenerId: listener.id,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return notifications;
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
const eventService = new ProductConfigurationEventService();

module.exports = eventService;

// backend/routes/hub.js - Event subscription management
const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');

// Register listener (TMF688)
router.post('/', (req, res) => {
  try {
    const { callback, query = '' } = req.body;
    
    if (!callback) {
      return res.status(400).json({ error: 'callback URL is required' });
    }
    
    const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const listener = eventService.registerListener(listenerId, callback, query);
    
    res.status(201).json(listener);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unregister listener
router.delete('/:id', (req, res) => {
  try {
    const removed = eventService.unregisterListener(req.params.id);
    
    if (!removed) {
      return res.status(404).json({ error: 'Listener not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all listeners
router.get('/', (req, res) => {
  try {
    const listeners = eventService.getListeners();
    res.json(listeners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;