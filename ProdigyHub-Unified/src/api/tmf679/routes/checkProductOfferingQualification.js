const express = require('express');
const router = express.Router();
const checkPOQController = require('../controllers/checkProductOfferingQualificationController');

// GET /checkProductOfferingQualification - List or find CheckProductOfferingQualification objects
router.get('/', checkPOQController.listCheckPOQ);

// GET /checkProductOfferingQualification/{id} - Retrieve a CheckProductOfferingQualification by ID
router.get('/:id', checkPOQController.getCheckPOQById);

// POST /checkProductOfferingQualification - Create a CheckProductOfferingQualification
router.post('/', checkPOQController.createCheckPOQ);

// PATCH /checkProductOfferingQualification/{id} - Update partially a CheckProductOfferingQualification
router.patch('/:id', checkPOQController.updateCheckPOQ);

// DELETE /checkProductOfferingQualification/{id} - Delete a CheckProductOfferingQualification
router.delete('/:id', checkPOQController.deleteCheckPOQ);

module.exports = router;