// routes/admin.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

// Try both common controller filenames.
let ctrl;
try {
  ctrl = require('../controllers/admin.controller');
} catch (e1) {
  try {
    ctrl = require('../controllers/adminController');
  } catch (e2) {
    console.error(
      "[routes/admin] Can't find admin controller. Create one of:\n" +
      " - Backend/controllers/admin.controller.js\n" +
      " - Backend/controllers/adminController.js\n"
    );
    throw e2;
  }
}

// Admin middleware
const adminMiddleware = [verifyToken, (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      msg: 'Admin access required' 
    });
  }
}];

// GET /api/admin/providers - Get all providers
router.get('/providers', adminMiddleware, ctrl.getAllProviders);

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', adminMiddleware, ctrl.getDashboardStats);

// PUT /api/admin/providers/:providerId/status - Update provider status
router.put('/providers/:providerId/status', adminMiddleware, ctrl.updateProviderStatus);

// DELETE /api/admin/providers/:providerId - Remove fake vendor
router.delete('/providers/:providerId', adminMiddleware, ctrl.deleteProvider);

// GET /api/admin/bookings - Get all bookings
router.get('/bookings', adminMiddleware, ctrl.getAllBookings);

// PATCH /api/admin/bookings/:bookingId/status - Update booking status
router.patch('/bookings/:bookingId/status', adminMiddleware, ctrl.updateBookingStatus);

// GET /api/admin/users - Get all users
router.get('/users', adminMiddleware, ctrl.getAllUsers);

module.exports = router;
