import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { AuthUser } from '../../src/types/auth';

// Signed exactly like the real login does, so the real auth middleware runs in every test.
export function authCookie(user: AuthUser) {
  return `access_token=${jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: '15m' })}`;
}

export const asMember = (userId: string) => authCookie({ userType: 'member', userId });
export const asStaff = (staffId = '00000000-0000-4000-8000-000000000001') => authCookie({ userType: 'staff', staffId, role: 'staff' });

// CSRF protection is global: every POST/PUT/PATCH/DELETE needs the token plus the cookie it was
// issued with. Returns helpers that send both, plus an optional auth cookie.
export async function client(app: Express, auth?: string) {
  const res = await request(app).get('/api/auth/csrf-token');
  const csrfCookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  const csrfToken = res.body.csrfToken as string;
  const cookies = [csrfCookie, ...(auth ? [auth] : [])].join('; ');

  const withHeaders = (req: request.Test) => req.set('Cookie', cookies).set('X-CSRF-Token', csrfToken);
  return {
    csrfToken,
    get: (url: string) => request(app).get(url).set('Cookie', cookies),
    post: (url: string, body?: object) => withHeaders(request(app).post(url)).send(body ?? {}),
    patch: (url: string, body?: object) => withHeaders(request(app).patch(url)).send(body ?? {}),
    put: (url: string, body?: object) => withHeaders(request(app).put(url)).send(body ?? {}),
    delete: (url: string) => withHeaders(request(app).delete(url)),
  };
}
