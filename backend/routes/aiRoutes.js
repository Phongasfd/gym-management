const express = require('express');
const router = express.Router();

const aiService = require('../services/ai.service');
const { getAdviceCache, setAdviceCache } = require('../utils/redisCache');
const aiRateLimit = require('../middleware/aiRateLimit');

// basic validation helper
function validateInput(body) {
  const required = ['age', 'gender', 'weight', 'height', 'activity_level', 'goal'];
  for (const field of required) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ''
    ) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

router.post('/advice', aiRateLimit, async (req, res) => {
  const errMsg = validateInput(req.body);
  if (errMsg) {
    return res.status(400).json({ message: errMsg });
  }

  try {
    // try read from cache first
    const cached = await getAdviceCache(req.body);
    if (cached) {
      return res.json({ data: cached, cached: true });
    }

    const advice = await aiService.getAdvice(req.body);

    // store in cache asynchronously (don't block response if it fails)
    setAdviceCache(req.body, advice).catch((e) => {
      console.error('Failed to cache AI advice', e);
    });

    res.json({ data: advice });
  } catch (err) {
    console.error('AI advice route error', err);
    // sanitize error message
    res.status(500).json({ message: 'Failed to generate advice at this time.' });
  }
});

module.exports = router;
