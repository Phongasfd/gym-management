const redisClient = require('../config/redis');
const crypto = require('crypto');

function _hashBody(body) {
  const str = JSON.stringify(body);
  return crypto.createHash('sha256').update(str).digest('hex');
}


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
