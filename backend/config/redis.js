const redis = require('redis');

// Use REDIS_URL env var if provided 
// Falls back to local redis without password if not provided
const redisUrl = process.env.REDIS_URL; 

// Create Redis client (node-redis v4)
const client = redis.createClient({ url: redisUrl });

// Error handling
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('Redis client connecting...');
});

client.on('ready', () => {
  console.log('Connected to Redis');
});

// Connect on startup (async)
(async () => {
  try {
    if(process.env.NODE_ENV !== 'test') {
      await client.connect();
    }
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    // If Redis is essential for your app, you may exit. Otherwise handle gracefully.
    // process.exit(1);
  }
})();

module.exports = client;
