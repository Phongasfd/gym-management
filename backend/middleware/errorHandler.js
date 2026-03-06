const logger = require('../utils/logger');

// global error-handling middleware
// logs error details and sends generic response to client
module.exports = function errorHandler(err, req, res) {
  const status = err.status || 500;

  const sensitiveRoutes = ['/login', '/register'];

  const sanitizedBody = { ...req.body };
  
  if (sensitiveRoutes.some(route => req.originalUrl.includes(route))) {
    delete sanitizedBody.password;
  }
  
  logger.error(err.message, {
    type: 'APP_ERROR',
    status,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    body: sanitizedBody,
  });

  // in production, avoid exposing error details in the response
  const response = { message: status === 500 ? 'Internal server error' : err.message };

  res.status(status).json(response);
};
