const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const adminCtrl = require('../controllers/adminServiceController');

// admin list all services
router.get('/services/list', verifyToken, async (req,res,next) => {
  if (!req.user || req.user.role!=='admin') return res.status(403).json({ msg:'Admin only' });
  next();
}, adminCtrl.listAllServices);

// pending
router.get('/services/pending', verifyToken, async (req,res,next) => {
  if (!req.user || req.user.role!=='admin') return res.status(403).json({ msg:'Admin only' });
  next();
}, adminCtrl.listPendingServices);

// approve
router.patch('/services/:id/approve', verifyToken, async (req,res,next) => {
  if (!req.user || req.user.role!=='admin') return res.status(403).json({ msg:'Admin only' });
  next();
}, adminCtrl.approveService);

module.exports = router;
