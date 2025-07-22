const express = require('express');
const ProductOrderController = require('../controllers/productOrderController');

const router = express.Router();
const controller = new ProductOrderController();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'TMF622 Product Ordering Management API',
    version: 'v4'
  });
});

// ProductOrder endpoints
router.post('/productOrder', (req, res) => controller.createProductOrder(req, res));
router.get('/productOrder', (req, res) => controller.getProductOrders(req, res));
router.get('/productOrder/:id', (req, res) => controller.getProductOrderById(req, res));
router.patch('/productOrder/:id', (req, res) => controller.updateProductOrder(req, res));
router.delete('/productOrder/:id', (req, res) => controller.deleteProductOrder(req, res));

// CancelProductOrder endpoints
router.post('/cancelProductOrder', (req, res) => controller.createCancelProductOrder(req, res));
router.get('/cancelProductOrder', (req, res) => controller.getCancelProductOrders(req, res));
router.get('/cancelProductOrder/:id', (req, res) => controller.getCancelProductOrderById(req, res));

// Handle preflight requests for CORS
router.options('*', (req, res) => {
  res.status(200).send();
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({
    "@type": "Error",
    code: "500",
    reason: "Internal Server Error",
    message: err.message || "An unexpected error occurred"
  });
});

module.exports = router;