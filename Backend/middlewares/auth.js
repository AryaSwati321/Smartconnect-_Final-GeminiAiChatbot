const User = require('../models/User'); // adjust path
const { verifyAuthToken } = require('../utils/jwt');

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ msg: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = verifyAuthToken(token);
    // optionally load user from DB for roles / latest data
    const user = await User.findById(payload.id).select('+authToken').lean();
    if (!user || !user.authToken || user.authToken !== token) {
      return res.status(401).json({ msg: 'Invalid token session' });
    }

    const { authToken, ...safeUser } = user;
    req.user = { ...safeUser, id: safeUser._id };
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Invalid token' });
  }
}

// optionalAuth: if token present, attach req.user; else continue as unauthenticated
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  const token = auth.split(' ')[1];
  try {
    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.id).select('+authToken').lean();
    if (!user || !user.authToken || user.authToken !== token) {
      req.user = null;
      return next();
    }

    const { authToken, ...safeUser } = user;
    req.user = { ...safeUser, id: safeUser._id };
  } catch (err) {
    // ignore invalid token -> treat as unauthenticated
    req.user = null;
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ msg: 'Forbidden: admin only' });
  next();
}

module.exports = { verifyToken, optionalAuth, isAdmin };
