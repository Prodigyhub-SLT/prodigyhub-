const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

// Event routes
router.get('/event', eventController.getAllEvents);
router.get('/event/:id', eventController.getEventById);
router.post('/event', eventController.createEvent);
router.patch('/event/:id', eventController.updateEvent);
router.delete('/event/:id', eventController.deleteEvent);

module.exports = router;