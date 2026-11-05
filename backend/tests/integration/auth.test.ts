import bcrypt from 'bcryptjs';
import request from 'supertest';

const sentCodes: string[] = [];
jest.mock('../../src/services/emailService', () => ({
  ...jest.requireActual('../../src/services/emailService'),
  sendPasswordResetEmail: jest.fn(async (_email: string, code: string) => {
    sentCodes.push(code);
    return true;
  }),
}));

import { createApp } from '../../src/app';
import { createMember, prisma, resetDb } from '../helpers/db';
import { client } from '../helpers/http';

const app = createApp();

beforeEach(async () => {
  await resetDb();
  sentCodes.length = 0;
});
afterAll(() => prisma.$disconnect());

function cookiesOf(res: request.Response): string[] {
  return (res.headers['set-cookie'] as unknown as string[]) ?? [];
}
const cookie = (res: request.Response, name: string) => cookiesOf(res).find((c) => c.startsWith(`${name}=`))?.split(';')[0];

async function staffLogin() {
  await prisma.user.create({
    data: { email: 'staff@example.com', password_hash: await bcrypt.hash('Password123@', 10), full_name: 'Staff', role: 'staff' },
  });
  const c = await client(app);
  return c.post('/api/auth/staff-login', { email: 'staff@example.com', password: 'Password123@' });
}

test('staff login sets httpOnly cookies and /api/auth/staff works with them', async () => {
  const res = await staffLogin();
  expect(res.status).toBe(200);
  expect(cookiesOf(res).every((c) => /HttpOnly/i.test(c))).toBe(true);

  const me = await request(app).get('/api/auth/staff').set('Cookie', cookie(res, 'access_token')!);
  expect(me.body.user).toMatchObject({ email: 'staff@example.com', role: 'staff' });
});

test('wrong password and unknown e-mail give the same 401', async () => {
  await staffLogin();
  const c = await client(app);
  const wrong = await c.post('/api/auth/staff-login', { email: 'staff@example.com', password: 'nope' });
  const unknown = await c.post('/api/auth/staff-login', { email: 'ghost@example.com', password: 'nope' });
  expect([wrong.status, unknown.status]).toEqual([401, 401]);
  expect(wrong.body.message).toBe(unknown.body.message);
});

test('refresh rotates the token; replaying the old one revokes every session', async () => {
  const login = await staffLogin();
  const first = cookie(login, 'refresh_token')!;

  const refreshed = await request(app).get('/api/auth/refresh-token').set('Cookie', first);
  expect(refreshed.status).toBe(200);
  const second = cookie(refreshed, 'refresh_token')!;
  expect(second).not.toBe(first);

  // An attacker replays the stolen first token
  expect((await request(app).get('/api/auth/refresh-token').set('Cookie', first)).status).toBe(401);
  // ...which also kills the legitimate user's current token
  expect((await request(app).get('/api/auth/refresh-token').set('Cookie', second)).status).toBe(401);
  expect(await prisma.refreshToken.count({ where: { revoked: false } })).toBe(0);
});

test('logout revokes the refresh token', async () => {
  const login = await staffLogin();
  const c = await client(app, [cookie(login, 'access_token'), cookie(login, 'refresh_token')].join('; '));
  expect((await c.post('/api/auth/logout')).status).toBe(200);
  expect((await request(app).get('/api/auth/refresh-token').set('Cookie', cookie(login, 'refresh_token')!)).status).toBe(401);
});

test('member register → login → /me', async () => {
  const c = await client(app);
  const reg = await c.post('/api/auth/member-register', {
    full_name: 'An Nguyen',
    email: 'an@example.com',
    password: 'longenough1',
    phone: '0901234567',
    gender: 'Male',
    date_of_birth: '1999-05-01',
  });
  expect(reg.status).toBe(201);
  expect((await c.post('/api/auth/member-register', { full_name: 'X', email: 'an@example.com', password: 'longenough1' })).status).toBe(409);

  const login = await c.post('/api/auth/member-login', { email: 'an@example.com', password: 'longenough1' });
  expect(login.status).toBe(200);
  const me = await request(app).get('/api/auth/me').set('Cookie', cookie(login, 'access_token')!);
  expect(me.body).toMatchObject({ email: 'an@example.com', gender: 'male', isProfileComplete: true });
});

test('short passwords are rejected at registration', async () => {
  const res = await (await client(app)).post('/api/auth/member-register', { full_name: 'A', email: 'a@example.com', password: 'short' });
  expect(res.status).toBe(400);
});

describe('password reset', () => {
  test('full flow: code by e-mail (stored hashed), verify, reset, old sessions revoked', async () => {
    const m = await createMember({ email: 'reset@example.com', password_hash: await bcrypt.hash('oldpassword', 10) });
    await prisma.refreshToken.create({ data: { user_id: m.id, user_type: 'member', token_hash: 'h', expires_at: new Date(Date.now() + 86_400_000) } });
    const c = await client(app);

    expect((await c.post('/api/auth/forgot-password', { email: 'reset@example.com' })).status).toBe(200);
    const code = sentCodes[0];
    expect(code).toMatch(/^\d{6}$/);
    const stored = await prisma.member.findUniqueOrThrow({ where: { id: m.id } });
    expect(stored.reset_code).not.toBe(code); // only a hash is stored

    expect((await c.post('/api/auth/verify-reset-code', { email: 'reset@example.com', resetCode: code })).status).toBe(200);
    expect((await c.post('/api/auth/reset-password', { email: 'reset@example.com', resetCode: code, newPassword: 'newpassword1' })).status).toBe(200);

    expect((await c.post('/api/auth/member-login', { email: 'reset@example.com', password: 'newpassword1' })).status).toBe(200);
    expect(await prisma.refreshToken.count({ where: { user_id: m.id, token_hash: 'h', revoked: true } })).toBe(1);
    // The code is single-use
    expect((await c.post('/api/auth/reset-password', { email: 'reset@example.com', resetCode: code, newPassword: 'another1234' })).status).toBe(401);
  });

  test('unknown e-mail: same answer, nothing sent (no account enumeration)', async () => {
    const res = await (await client(app)).post('/api/auth/forgot-password', { email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(sentCodes).toHaveLength(0);
  });

  test('resetting with an unknown e-mail is a 401, not a crash', async () => {
    const res = await (await client(app)).post('/api/auth/reset-password', { email: 'nobody@example.com', resetCode: '123456', newPassword: 'newpassword1' });
    expect(res.status).toBe(401);
  });

  test('five wrong guesses burn the code, even the right one stops working', async () => {
    await createMember({ email: 'guess@example.com' });
    const c = await client(app);
    await c.post('/api/auth/forgot-password', { email: 'guess@example.com' });
    const code = sentCodes[0];
    const wrong = code === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) {
      expect((await c.post('/api/auth/verify-reset-code', { email: 'guess@example.com', resetCode: wrong })).status).toBe(401);
    }
    expect((await c.post('/api/auth/verify-reset-code', { email: 'guess@example.com', resetCode: code })).status).toBe(401);
  });

  test('a plaintext code left by the old version is refused, not a 500', async () => {
    await createMember({ email: 'legacy@example.com', reset_code: '123456', reset_code_expires: new Date(Date.now() + 60_000) });
    const res = await (await client(app)).post('/api/auth/verify-reset-code', { email: 'legacy@example.com', resetCode: '123456' });
    expect(res.status).toBe(401);
  });

  test('an expired code is refused', async () => {
    await createMember({ email: 'late@example.com' });
    const c = await client(app);
    await c.post('/api/auth/forgot-password', { email: 'late@example.com' });
    await prisma.member.update({ where: { email: 'late@example.com' }, data: { reset_code_expires: new Date(Date.now() - 1000) } });
    expect((await c.post('/api/auth/verify-reset-code', { email: 'late@example.com', resetCode: sentCodes[0] })).status).toBe(401);
  });
});

test('staff password change: wrong current password is refused, then other sessions are revoked', async () => {
  const login = await staffLogin();
  const c = await client(app, cookie(login, 'access_token'));
  expect((await c.patch('/api/staff/update-password', { currentPassword: 'bad', newPassword: 'Newpassword1', confirm: 'Newpassword1' })).status).toBe(400);
  expect((await c.patch('/api/staff/update-password', { currentPassword: 'Password123@', newPassword: 'Newpassword1', confirm: 'nope' })).status).toBe(400);
  expect((await c.patch('/api/staff/update-password', { currentPassword: 'Password123@', newPassword: 'Newpassword1', confirm: 'Newpassword1' })).status).toBe(200);
  expect(await prisma.refreshToken.count({ where: { revoked: false } })).toBe(0);
});
