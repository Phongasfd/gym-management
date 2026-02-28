const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Helper to create a Redis-backed store for express-rate-limit
// We pass the modern redis client via `sendCommand` wrapper which rate-limit-redis
// can use to issue commands. If your version of rate-limit-redis supports a
// `client` option directly for node-redis v4, that may also work.
function createStore() {
  try {
    return new RedisStore({
      client: redisClient,
    });
  } catch (err) {
    console.error('Failed to create Redis rate-limit store:', err);
    return undefined; // express-rate-limit will fallback to MemoryStore
  }
}

// Global limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  message: 'Too many requests from this IP, please try again later.',
});

// Login limiter: 5 requests per minute per IP (for login endpoints)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  message: 'Too many login attempts from this IP, please try again after a minute.',
});

module.exports = { globalLimiter, loginLimiter };
