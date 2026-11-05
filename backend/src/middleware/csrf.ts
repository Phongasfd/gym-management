import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env';

// Signed double-submit cookie. The token is an HMAC of a random value; the browser must send it
// back in the X-CSRF-Token header and it must match the httpOnly cookie, which another site can
// neither read nor forge.
export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.csrfSecret,
  // Auth is a stateless JWT cookie that rotates every 15 minutes, so there is no stable session id
  // to bind the token to. In production the __Host- prefix (secure, host-only, path=/) stops a
  // subdomain from planting its own token cookie, which is the attack binding prevents.
  getSessionIdentifier: () => '',
  cookieName: env.isProd ? '__Host-gym.x-csrf-token' : 'gym.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  },
});
