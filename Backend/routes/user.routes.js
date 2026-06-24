// backend/routes/user.routes.js
const router = require('express').Router();
const { getMe, updateMe } = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth');

router.get('/user/me', verifyToken, getMe);
router.put('/user/me', verifyToken, updateMe);

module.exports = router;
