// An expected, client-facing error: the message is safe to return and the status is a 4xx/5xx.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    Error.captureStackTrace(this, this.constructor);
  }
}
