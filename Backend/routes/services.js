const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { optionalAuth, verifyToken, isAdmin } = require('../middlewares/auth');

// Public listing: optionalAuth attaches req.user if token present
router.get('/', optionalAuth, serviceController.listServices);

// Create service: vendor only (use verifyToken)
router.post('/', verifyToken, serviceController.createService);

// Admin actions
router.patch('/:id/approve', verifyToken, isAdmin, serviceController.approveService);
router.patch('/:id/block', verifyToken, isAdmin, serviceController.blockService);
router.patch('/:id/visible', verifyToken, isAdmin, serviceController.toggleVisibility);

module.exports = router;
