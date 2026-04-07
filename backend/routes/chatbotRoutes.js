const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { chat } = require('../controllers/chatbotController');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/chatbot
// @desc    Interaction with the AI Chatbot
// @access  Public (Optionally private if tracking user context strictly)
// Soft-auth middleware for the chatbot: populates req.user if token is valid, but doesn't block if missing/invalid
const softAuth = (req, res, next) => {
    const token = req.cookies?.token || req.cookies?.adminToken || req.cookies?.deliveryToken;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Ignore invalid tokens for the chatbot
        }
    }
    next();
};

router.post('/', softAuth, chat);

module.exports = router;
