const express = require('express');
const router = express.Router();

const aiService = require('../services/ai.service');
const { aiLimiter } = require('../middleware/rateLimit');

router.post('/chat', aiLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Messages array is required' });
  }

  try {
    const response = await aiService.chatWithAI(messages);
    res.json({ message: response });
  } catch (err) {
    console.error('AI chat route error', err);
    res.status(500).json({ message: 'Failed to get chat response at this time.' });
  }
});

module.exports = router;
