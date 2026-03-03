const redisClient = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Simple Redis-backed rate limiter for AI advice route.
 * 10 requests per 10 minutes per IP. If Redis is down the middleware
 * fails open (allows request) but logs an error.
 */
module.exports = async function aiRateLimit(req, res, next) {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] || req.ip ||
      req.connection?.remoteAddress || 'unknown';
    const key = `rate:ai:${ip}`;

    const current = await redisClient.incr(key);
    if (current === 1) {
      // first request, set expiry 10 minutes
      await redisClient.expire(key, 10 * 60);
    }

    if (current > 10) {
      logger.warn('AI advice rate limit exceeded', { ip, count: current });
      return res
        .status(429)
        .json({ message: 'Too many AI requests, please try again later.' });
    }

    next();
  } catch (err) {
    // if Redis fails, don't block the route (fail open) but log
    logger.error('AI rate limiter failed', { error: err.message, stack: err.stack });
    next();
  }
};
