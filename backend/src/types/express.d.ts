import type { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      // Set by middleware/auth.ts from the access_token cookie. `req.user` stays Passport's
      // (the OAuth profile during the Google/Facebook callback).
      auth?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
