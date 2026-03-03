const redisClient = require('../config/redis');
const crypto = require('crypto');

function _hashBody(body) {
  const str = JSON.stringify(body);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Try to retrieve cached advice using the body as key material.
 * @param {Object} body
 * @returns {Promise<Object|null>} parsed value or null if missing
 */
async function getAdviceCache(body) {
  try {
    const hash = _hashBody(body);
    const key = `ai:advice:${hash}`;
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    // on any failure treat as cache miss
    console.error('Redis cache read failed', err);
    return null;
  }
}

/**
 * Store advice in cache for one hour. Body is hashed to form key.
 * @param {Object} body
 * @param {Object} data
 */
async function setAdviceCache(body, data) {
  try {
    const hash = _hashBody(body);
    const key = `ai:advice:${hash}`;
    await redisClient.set(key, JSON.stringify(data), { EX: 60 * 60 });
  } catch (err) {
    console.error('Redis cache write failed', err);
    // swallow error, caching is best-effort
  }
}

module.exports = { getAdviceCache, setAdviceCache };
