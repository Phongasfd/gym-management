const logger = require('../utils/logger');
const { Prisma } = require('@prisma/client');

module.exports = function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // ===== Handle Prisma Errors =====
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    status = prismaError.status;
    message = prismaError.message;
  }

  // ===== Sanitize sensitive data =====
  const sensitiveRoutes = ['/login', '/register'];
  const sanitizedBody = { ...req.body }; // shallow copy of request body

  if (sensitiveRoutes.some(route => req.originalUrl.includes(route))) {  // check if the request URL contains any of the sensitive routes
    delete sanitizedBody.password;
  }

  // ===== Logging =====
  logger.error(message, {
    type: 'APP_ERROR',
    status,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    body: sanitizedBody,
  });

  // ===== Response =====
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    message: status === 500 ? 'Internal server error' : message,
  };

  // Dev mode: add debug info
  if (!isProduction) {
    response.stack = err.stack;
    response.error = err;
  }

  return res.status(status).json(response);
};

// ===== Prisma error mapping =====
function handlePrismaError(err) {
  switch (err.code) {
    case 'P2002':
      return {
        status: 400,
        message: `Duplicate field: ${err.meta?.target}`,
      };

    case 'P2025':
      return {
        status: 404,
        message: 'Record not found',
      };

    case 'P2003':
      return {
        status: 400,
        message: 'Invalid foreign key',
      };

    default:
      return {
        status: 400,
        message: err.message,
      };
  }
}