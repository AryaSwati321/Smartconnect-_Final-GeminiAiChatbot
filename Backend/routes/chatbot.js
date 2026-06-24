// backend/routes/chatbot.js
const express = require('express');
const { verifyToken } = require('../middlewares/auth');
const { chatMessage, getChatHistory } = require('../controllers/chatbotController');

const router = express.Router();

// AI Chat endpoint
router.post('/message', verifyToken, chatMessage);

// Get chat history/initial data
router.get('/history', verifyToken, getChatHistory);

module.exports = router;
