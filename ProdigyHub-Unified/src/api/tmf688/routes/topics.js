const express = require('express');
const topicController = require('../controllers/topicController');

const router = express.Router();

// Topic routes
router.get('/topic', topicController.getAllTopics);
router.get('/topic/:id', topicController.getTopicById);
router.post('/topic', topicController.createTopic);
router.delete('/topic/:id', topicController.deleteTopic);

module.exports = router;