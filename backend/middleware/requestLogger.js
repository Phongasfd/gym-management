const logger = require('../utils/logger');

// logs info about each HTTP request after response is finished
module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime();
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress;

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const responseTimeMs = (seconds * 1e3 + nanoseconds / 1e6).toFixed(2);

    logger.info('HTTP request', {
      type: 'HTTP_REQUEST',
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: Number(responseTimeMs),
      ip,
      userId: req.user?.id
    });
  });

  next();
};