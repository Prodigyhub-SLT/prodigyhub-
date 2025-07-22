const express = require('express');
const router = express.Router();
const queryPOQController = require('../controllers/queryProductOfferingQualificationController');

// GET /queryProductOfferingQualification - List or find QueryProductOfferingQualification objects
router.get('/', queryPOQController.listQueryPOQ);

// GET /queryProductOfferingQualification/{id} - Retrieve a QueryProductOfferingQualification by ID
router.get('/:id', queryPOQController.getQueryPOQById);

// POST /queryProductOfferingQualification - Create a QueryProductOfferingQualification
router.post('/', queryPOQController.createQueryPOQ);

// PATCH /queryProductOfferingQualification/{id} - Update partially a QueryProductOfferingQualification
router.patch('/:id', queryPOQController.updateQueryPOQ);

// DELETE /queryProductOfferingQualification/{id} - Delete a QueryProductOfferingQualification
router.delete('/:id', queryPOQController.deleteQueryPOQ);

module.exports = router;