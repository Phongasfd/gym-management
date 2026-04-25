const express = require('express');
const router = express.Router();

const aiService = require('../services/ai.service');
const { aiLimiter } = require('../middleware/rateLimit');

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI advisory endpoints
 */

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with AI
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *             required:
 *               - messages
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Server Error
 */
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
