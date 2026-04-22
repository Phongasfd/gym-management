const logger = require('../utils/logger');

// logs info about each HTTP request after response is finished
module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime(); // high-resolution time for accurate response time measurement (nanoseconds)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress;

  res.on('finish', () => { // Event finish chạy sau khi response đã gửi xong cho client
    const [seconds, nanoseconds] = process.hrtime(start);  // tính thời gian đã trôi qua kể từ khi request bắt đầu đến khi response hoàn thành
    const responseTimeMs = (seconds * 1e3 + nanoseconds / 1e6).toFixed(2); // chuyển đổi thời gian sang milliseconds và làm tròn đến 2 chữ số thập phân

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