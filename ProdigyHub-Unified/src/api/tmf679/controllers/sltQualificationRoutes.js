// sltQualificationRoutes.js - Express routes for SLT Product Qualification API
const express = require('express');
const router = express.Router();
const sltQualificationController = require('../controllers/sltQualificationController');

// Base route info
router.get('/', (req, res) => {
  res.json({
    name: 'SLT Product Qualification API',
    version: '1.0.0',
    description: 'Sri Lanka Telecom product qualification and location availability checking service',
    baseUrl: '/api/slt',
    endpoints: {
      'POST /checkLocation': 'Check service availability for a specific location',
      'GET /qualifications': 'List all qualification records',
      'GET /qualifications/{id}': 'Get qualification by ID',
      'PATCH /qualifications/{id}': 'Update qualification record',
      'DELETE /qualifications/{id}': 'Delete qualification record',
      'GET /stats': 'Get qualification statistics and analytics',
      'GET /coverage': 'Get coverage map data',
      'GET /infrastructure/{district}': 'Get infrastructure details for district',
      'POST /packages': 'Get available service packages for location',
      'POST /qualifications/{id}/feedback': 'Submit feedback for qualification',
      'POST /checkBulk': 'Bulk location check for multiple addresses'
    },
    documentation: 'https://docs.slt.lk/api/qualification',
    support: 'api-support@slt.lk',
    '@type': 'SLTQualificationAPI'
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected',
    services: {
      locationCheck: 'operational',
      infrastructureData: 'operational',
      coverageMapping: 'operational'
    }
  });
});

// Core qualification endpoints
router.post('/checkLocation', sltQualificationController.checkLocation);
router.get('/qualifications', sltQualificationController.listQualifications);
router.get('/qualifications/:id', sltQualificationController.getQualificationById);
router.patch('/qualifications/:id', sltQualificationController.updateQualification);
router.delete('/qualifications/:id', sltQualificationController.deleteQualification);

// Analytics and reporting endpoints
router.get('/stats', sltQualificationController.getStats);
router.get('/coverage', sltQualificationController.getCoverage);
router.get('/infrastructure/:district', sltQualificationController.getInfrastructureDetails);

// Service package endpoints
router.post('/packages', sltQualificationController.getAvailablePackages);

// Feedback endpoint
router.post('/qualifications/:id/feedback', sltQualificationController.submitFeedback);

// Bulk operations endpoint
router.post('/checkBulk', sltQualificationController.checkBulkLocations);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('SLT Qualification API Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      '@type': 'ValidationError'
    });
  }
  
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return res.status(500).json({
      error: 'Database Error',
      message: 'Database operation failed',
      '@type': 'DatabaseError'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    '@type': 'InternalError'
  });
});

module.exports = router;