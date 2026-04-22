const { createLogger, format, transports } = require('winston');

// determine environment and log level
const env = process.env.NODE_ENV || 'development';
const level = env === 'production' ? 'info' : 'debug';

// structured JSON logger with timestamp and stack support
const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(), // add ISO timestamp
    format.errors({ stack: true }), // include stack trace for errors
    format.json() // output logs in JSON format
  ), 
  transports: [new transports.Console()], // log sẽ được gửi đi đâu
  exitOnError: false, // log lỗi → vẫn tiếp tục chạy app
});

module.exports = logger;
