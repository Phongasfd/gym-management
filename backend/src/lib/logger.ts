import { createLogger, format, transports } from 'winston';

const env = process.env.NODE_ENV || 'development';

// Structured JSON logs (one object per line), so they can be shipped to any log store as-is.
export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? (env === 'production' ? 'info' : 'debug'),
  silent: env === 'test' && process.env.LOG_IN_TESTS !== 'true',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [new transports.Console()],
  exitOnError: false,
});
