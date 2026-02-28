const { createLogger, format, transports } = require('winston');

// determine environment and log level
const env = process.env.NODE_ENV || 'development';
const level = env === 'production' ? 'info' : 'debug';

// structured JSON logger with timestamp and stack support
const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

module.exports = logger;
