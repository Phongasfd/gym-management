const { doubleCsrf } = require('csrf-csrf');

const isProd = process.env.NODE_ENV === 'production';

// Signed double-submit cookie CSRF protection (replaces csurf, which is deprecated and unmaintained).
// The token is an HMAC of a random value; the browser must send it back in the X-CSRF-Token header
// and it must match the httpOnly cookie, which another site can neither read nor forge.
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
if (!csrfSecret) {
  throw new Error('CSRF_SECRET (or JWT_SECRET) must be set');
}

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => csrfSecret,
  // Auth is a stateless JWT cookie that rotates every 15 minutes, so there is no stable session id
  // to bind the token to. In production the __Host- cookie prefix (secure, host-only, path=/) stops
  // a subdomain from planting its own token cookie, which is the attack that binding prevents.
  getSessionIdentifier: () => '',
  cookieName: isProd ? '__Host-gym.x-csrf-token' : 'gym.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // same as the auth cookies
    path: '/',
  },
});

module.exports = { doubleCsrfProtection, generateCsrfToken };
