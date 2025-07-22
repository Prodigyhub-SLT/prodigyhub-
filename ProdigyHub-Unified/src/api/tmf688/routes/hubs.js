const express = require('express');
const hubController = require('../controllers/hubController');

const router = express.Router();

// Hub routes
router.get('/hub', hubController.getAllHubs);
router.get('/hub/:id', hubController.getHubById);
router.post('/hub', hubController.createHub);
router.delete('/hub/:id', hubController.deleteHub);

module.exports = router;