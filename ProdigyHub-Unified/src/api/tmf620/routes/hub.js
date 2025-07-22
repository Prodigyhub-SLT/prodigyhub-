// src/routes/hub.js - NEW FILE (Notification Hub)
const express = require('express');
const router = express.Router();

let listeners = [];
let idCounter = 1;

// Register a listener
router.post('/', (req, res, next) => {
  try {
    const { callback, query } = req.body;
    
    if (!callback) {
      return res.status(400).json({
        success: false,
        error: 'Callback URL is required'
      });
    }
    
    const id = (idCounter++).toString();
    const listener = {
      id,
      callback,
      query: query || '',
      registeredAt: new Date().toISOString()
    };
    
    listeners.push(listener);
    
    res.status(201)
       .location(`/productCatalogManagement/v5/hub/${id}`)
       .json(listener);
  } catch (error) {
    next(error);
  }
});

// Unregister a listener
router.delete('/:id', (req, res, next) => {
  try {
    const index = listeners.findIndex(l => l.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Listener not found'
      });
    }
    
    listeners.splice(index, 1);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

// GET all listeners (for debugging/admin purposes)
router.get('/', (req, res, next) => {
  try {
    res.status(200).json(listeners);
  } catch (error) {
    next(error);
  }
});

// GET specific listener (for debugging/admin purposes)
router.get('/:id', (req, res, next) => {
  try {
    const listener = listeners.find(l => l.id === req.params.id);
    
    if (!listener) {
      return res.status(404).json({
        success: false,
        error: 'Listener not found'
      });
    }
    
    res.status(200).json(listener);
  } catch (error) {
    next(error);
  }
});

// Function to send notifications to all registered listeners
const sendNotification = async (eventType, eventData) => {
  const notification = {
    eventType,
    event: eventData,
    eventTime: new Date().toISOString(),
    eventId: Math.random().toString(36).substr(2, 9)
  };
  
  // In a real implementation, you would make HTTP POST requests to each callback URL
  console.log(`📡 Notification would be sent to ${listeners.length} listeners:`, notification);
  
  // For demo purposes, just log the notification
  listeners.forEach(listener => {
    console.log(`  → ${listener.callback}`);
  });
  
  return notification;
};

// Export the sendNotification function for use in other routes
router.sendNotification = sendNotification;

module.exports = router;