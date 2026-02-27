const express = require('express');
const router = express.Router();
const { createSession, verifySession } = require('../controllers/livenessController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-session', protect, createSession);
router.post('/verify-session', protect, verifySession);

module.exports = router;
