const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

const logger = require('../utils/logger');

// Helper to create a Redis-backed store for express-rate-limit
// We pass the modern redis client via `sendCommand` wrapper which rate-limit-redis
// can use to issue commands. If your version of rate-limit-redis supports a
// `client` option directly for node-redis v4, that may also work.

if (process.env.NODE_ENV === "test") {
  module.exports = {
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next(),
    aiLimiter: (req, res, next) => next(),
  };
  return;
}

function createStore() {
  try {
    const store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
    return store; 
  } catch (err) {
    logger.error('Failed to create Redis rate-limit store', {
      type: 'RATE_LIMIT_STORE_ERROR',
      error: err.message,
      stack: err.stack,
    });
    return undefined; // express-rate-limit will fallback to MemoryStore
  }
}

// helper to build handler that logs and responds
function makeHandler(message) {
  return (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress;
    logger.warn('Rate limit exceeded', {
      type: 'RATE_LIMIT',
      ip,
      route: req.originalUrl || req.url,
    });
    res.status(429).json({ message });
  };
}

// Global limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: makeHandler('Too many requests from this IP, please try again later.'),
});

// Login limiter: 5 requests per minute per IP (for login endpoints)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: makeHandler('Too many login attempts from this IP, please try again after a minute.'),
});

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: makeHandler('Too many AI requests, please try again later.'),
});

module.exports = { globalLimiter, loginLimiter, aiLimiter };
