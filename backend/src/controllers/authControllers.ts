import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Profile } from 'passport';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { generateCsrfToken } from '../middleware/csrf';
import { loginLimiter } from '../middleware/rateLimit';
import { dateInput, email, gender, name, optional, password, phone } from '../schemas/common';
import { sendPasswordResetEmail } from '../services/emailService';
import type { AuthUser } from '../types/auth';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const refreshTtlMs = () => env.refreshTtlDays * 24 * 60 * 60 * 1000;

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: env.isProd, sameSite: env.isProd ? ('none' as const) : ('lax' as const), maxAge };
}

// Signs a 15-minute access token and stores a new opaque refresh token (only its hash).
async function issueSession(req: Request, res: Response, user: AuthUser) {
  const access = jwt.sign(user, env.jwtSecret, { expiresIn: '15m' });
  const refreshRaw = crypto.randomBytes(64).toString('hex');

  const record = await prisma.refreshToken.create({
    data: {
      user_id: user.userType === 'member' ? user.userId : user.staffId,
      user_type: user.userType,
      token_hash: sha256(refreshRaw),
      expires_at: new Date(Date.now() + refreshTtlMs()),
      created_by_ip: req.ip,
      user_agent: req.get('User-Agent') ?? null,
    },
  });

  res.cookie('access_token', access, cookieOptions(ACCESS_TTL_MS));
  res.cookie('refresh_token', refreshRaw, cookieOptions(refreshTtlMs()));
  return record.id;
}

function clearSessionCookies(res: Response) {
  const { maxAge: _ignored, ...options } = cookieOptions(0);
  res.clearCookie('access_token', options);
  res.clearCookie('refresh_token', options);
}

// Equalises timing between "no such user" and "wrong password".
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

async function checkPassword(plain: string, hash: string | null | undefined) {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH).then((ok) => ok && Boolean(hash));
}

export const csrfToken = endpoint({ summary: 'Get a CSRF token (sets its cookie)', auth: 'public' }, async ({ req, res }) => {
  // Reuses the existing token cookie when there is one, so repeated calls return the same token.
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

export const memberRegister = endpoint(
  {
    summary: 'Register a member with e-mail and password',
    auth: 'public',
    body: z.object({
      full_name: name,
      email,
      password,
      phone: optional(phone),
      gender: optional(gender),
      date_of_birth: optional(dateInput),
    }),
    responses: { 201: 'Registered', 409: 'E-mail already registered' },
  },
  async ({ body, res }) => {
    await prisma.member.create({
      data: {
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        gender: body.gender,
        date_of_birth: body.date_of_birth,
        password_hash: await bcrypt.hash(body.password, 10),
        isProfileComplete: Boolean(body.phone && body.gender && body.date_of_birth),
      },
    });
    res.status(201).json({ msg: 'Member registered successfully' });
  },
);

export const memberCompleteProfile = endpoint(
  {
    summary: 'Complete the profile after a social sign-in',
    auth: 'member',
    body: z.object({ fullName: name, phone, dob: dateInput, gender }),
  },
  async ({ body, auth, res }) => {
    await prisma.member.update({
      where: { id: auth.userId },
      data: { full_name: body.fullName, phone: body.phone, gender: body.gender, date_of_birth: body.dob, isProfileComplete: true },
    });
    res.json({ msg: 'Member Profile Completed' });
  },
);

export const getMe = endpoint({ summary: 'Current member profile', auth: 'member' }, async ({ auth, res }) => {
  const member = await prisma.member.findUnique({ where: { id: auth.userId } });
  if (!member) throw new AppError('Member not found', 404);
  res.json({
    id: member.id,
    full_name: member.full_name,
    email: member.email,
    phone: member.phone,
    date_of_birth: member.date_of_birth,
    gender: member.gender,
    isProfileComplete: member.isProfileComplete,
  });
});

const loginBody = z.object({ email, password: z.string().min(1).max(128) });

export const memberLogin = endpoint(
  { summary: 'Member login (sets auth cookies)', auth: 'public', body: loginBody, middleware: [loginLimiter], responses: { 200: 'Logged in', 401: 'Invalid credentials' } },
  async ({ body, req, res }) => {
    const member = await prisma.member.findUnique({ where: { email: body.email } });
    if (!(await checkPassword(body.password, member?.password_hash)) || !member) {
      logger.warn('Login failed', { type: 'LOGIN_FAIL', email: body.email, ip: req.ip });
      throw new AppError('Invalid credentials', 401);
    }
    await issueSession(req, res, { userType: 'member', userId: member.id });
    res.json({ msg: 'Login successful', user: { id: member.id, full_name: member.full_name, email: member.email } });
  },
);

export const staffLogin = endpoint(
  { summary: 'Staff login (sets auth cookies)', auth: 'public', body: loginBody, middleware: [loginLimiter], responses: { 200: 'Logged in', 401: 'Invalid credentials' } },
  async ({ body, req, res }) => {
    const staff = await prisma.user.findUnique({ where: { email: body.email } });
    if (!(await checkPassword(body.password, staff?.password_hash)) || !staff || !staff.is_active) {
      logger.warn('Login failed', { type: 'LOGIN_FAIL', email: body.email, ip: req.ip });
      throw new AppError('Invalid credentials', 401);
    }
    await issueSession(req, res, { userType: 'staff', staffId: staff.id, role: staff.role });
    res.json({ msg: 'Login successful', user: { id: staff.id, full_name: staff.full_name, email: staff.email, role: staff.role } });
  },
);

export const getStaff = endpoint({ summary: 'Current staff profile', auth: 'staff' }, async ({ auth, res }) => {
  const user = await prisma.user.findUnique({
    where: { id: auth.staffId },
    select: { id: true, email: true, full_name: true, role: true },
  });
  res.json({ user });
});

export const logOut = endpoint({ summary: 'Log out and revoke the refresh token', auth: 'user' }, async ({ req, res }) => {
  const incoming: unknown = req.cookies?.refresh_token;
  if (typeof incoming === 'string' && incoming) {
    await prisma.refreshToken.updateMany({ where: { token_hash: sha256(incoming) }, data: { revoked: true } });
  }
  clearSessionCookies(res);
  res.json({ msg: 'Logged out successfully' });
});

// Rotation: every refresh replaces the refresh token. Presenting an already-replaced token means
// it was stolen (or replayed), so every session of that user is revoked.
export const refreshToken = endpoint({ summary: 'Rotate the refresh token and issue a new access token', auth: 'public' }, async ({ req, res }) => {
  const incoming: unknown = req.cookies?.refresh_token;
  if (typeof incoming !== 'string' || !incoming) throw new AppError('No refresh token', 401);

  const record = await prisma.refreshToken.findFirst({ where: { token_hash: sha256(incoming) } });
  if (!record) throw new AppError('Invalid refresh token', 401);

  if (record.revoked) {
    await prisma.refreshToken.updateMany({ where: { user_id: record.user_id }, data: { revoked: true } });
    logger.warn('Refresh token reuse detected, all sessions revoked', { type: 'TOKEN_REUSE', userId: record.user_id });
    throw new AppError('Refresh token revoked', 401);
  }
  if (new Date() > record.expires_at) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
    throw new AppError('Refresh token expired', 401);
  }

  let user: AuthUser;
  if (record.user_type === 'member') {
    const member = await prisma.member.findUnique({ where: { id: record.user_id }, select: { id: true } });
    if (!member) throw new AppError('Invalid refresh token', 401);
    user = { userType: 'member', userId: member.id };
  } else {
    const staff = await prisma.user.findUnique({ where: { id: record.user_id } });
    if (!staff || !staff.is_active) throw new AppError('Invalid refresh token', 401);
    user = { userType: 'staff', staffId: staff.id, role: staff.role };
  }

  // Revoke first, conditionally: of two concurrent refreshes with the same token only one wins.
  const { count } = await prisma.refreshToken.updateMany({ where: { id: record.id, revoked: false }, data: { revoked: true } });
  if (count === 0) throw new AppError('Refresh token revoked', 401);

  const replacementId = await issueSession(req, res, user);
  await prisma.refreshToken.update({ where: { id: record.id }, data: { replaced_by: replacementId } });
  res.json({ msg: 'Token refreshed' });
});

// ===== OAuth (Passport puts the provider profile in req.user) =====

async function finishSocialLogin(req: Request, res: Response, memberId: string, complete: boolean) {
  await issueSession(req, res, { userType: 'member', userId: memberId, ...(complete ? {} : { needCompleteProfile: true }) });
  res.redirect(complete ? env.frontendUrl : `${env.frontendUrl}/complete-profile`);
}

const isComplete = (m: { date_of_birth: Date | null; gender: string | null; phone: string | null }) =>
  Boolean(m.date_of_birth && m.gender && m.phone);

export async function googleSuccess(req: Request, res: Response) {
  const profile = req.user as Profile;
  const primary = profile.emails?.[0] as { value: string; verified?: boolean } | undefined;
  // Only an address Google has verified may be linked to an existing account with that e-mail.
  const profileEmail = primary && primary.verified !== false ? primary.value : undefined;

  let member = await prisma.member.findFirst({
    where: { OR: [{ googleId: profile.id }, ...(profileEmail ? [{ email: profileEmail }] : [])] },
  });
  if (!member) {
    if (!profileEmail) throw new AppError('Your Google account has no e-mail address', 400);
    member = await prisma.member.create({
      data: { full_name: profile.displayName, email: profileEmail, googleId: profile.id, isProfileComplete: false },
    });
  } else if (!member.googleId) {
    member = await prisma.member.update({ where: { id: member.id }, data: { googleId: profile.id } });
  }
  await finishSocialLogin(req, res, member.id, isComplete(member));
}

export async function facebookSuccess(req: Request, res: Response) {
  const profile = req.user as Profile;
  let member = await prisma.member.findUnique({ where: { facebookId: profile.id } });
  if (!member) {
    // Facebook does not always share an e-mail; Member.email is required and unique, so use a
    // per-account placeholder that the member can change from their profile.
    member = await prisma.member.create({
      data: {
        full_name: profile.displayName,
        email: profile.emails?.[0]?.value ?? `facebook-${profile.id}@users.noreply.local`,
        facebookId: profile.id,
        isProfileComplete: false,
      },
    });
  }
  await finishSocialLogin(req, res, member.id, isComplete(member));
}

// ===== Password reset =====

const GENERIC_RESET_MESSAGE = 'If an account exists with this email, a reset code will be sent';

export const forgotPassword = endpoint(
  { summary: 'E-mail a 6-digit password reset code', auth: 'public', body: z.object({ email }), middleware: [loginLimiter] },
  async ({ body, req, res }) => {
    const member = await prisma.member.findUnique({ where: { email: body.email } });
    // Same answer whether or not the account exists, so the endpoint cannot be used to find accounts.
    if (!member) {
      logger.warn('Forgot password for unknown email', { email: body.email, ip: req.ip });
      res.json({ msg: GENERIC_RESET_MESSAGE });
      return;
    }

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    await prisma.member.update({
      where: { id: member.id },
      data: { reset_code: sha256(resetCode), reset_code_expires: new Date(Date.now() + RESET_CODE_TTL_MS), reset_attempts: 0 },
    });

    // Answer before talking to SMTP: a slow send (or a send error) must not reveal that this
    // e-mail has an account. The send result is only logged.
    res.json({ msg: GENERIC_RESET_MESSAGE });
    void sendPasswordResetEmail(body.email, resetCode);
  },
);

const MAX_RESET_ATTEMPTS = 5;

async function findMemberWithValidCode(memberEmail: string, code: string) {
  const member = await prisma.member.findUnique({ where: { email: memberEmail } });
  const invalid = () => new AppError('Invalid or expired reset code', 401);
  if (!member?.reset_code || !member.reset_code_expires || member.reset_code_expires <= new Date()) throw invalid();

  const stored = Buffer.from(member.reset_code);
  const given = Buffer.from(sha256(code));
  // timingSafeEqual throws on different lengths (e.g. a plaintext code stored by the old version)
  const matches = stored.length === given.length && crypto.timingSafeEqual(stored, given);
  if (!matches) {
    // Too many wrong guesses burn the code; the member has to ask for a new one.
    const attempts = member.reset_attempts + 1;
    await prisma.member.update({
      where: { id: member.id },
      data: attempts >= MAX_RESET_ATTEMPTS ? { reset_code: null, reset_code_expires: null, reset_attempts: 0 } : { reset_attempts: attempts },
    });
    throw invalid();
  }
  return member;
}

const resetCodeSchema = z.string().regex(/^\d{6}$/, 'The code has 6 digits');

export const verifyResetCode = endpoint(
  { summary: 'Check a password reset code', auth: 'public', body: z.object({ email, resetCode: resetCodeSchema }), middleware: [loginLimiter] },
  async ({ body, res }) => {
    await findMemberWithValidCode(body.email, body.resetCode);
    res.json({ msg: 'Reset code is valid' });
  },
);

export const resetPassword = endpoint(
  {
    summary: 'Set a new password with a reset code',
    auth: 'public',
    body: z.object({ email, resetCode: resetCodeSchema, newPassword: password }),
    middleware: [loginLimiter],
  },
  async ({ body, res }) => {
    const member = await findMemberWithValidCode(body.email, body.resetCode);
    await prisma.$transaction([
      prisma.member.update({
        where: { id: member.id },
        data: { password_hash: await bcrypt.hash(body.newPassword, 10), reset_code: null, reset_code_expires: null },
      }),
      // A password reset ends every existing session.
      prisma.refreshToken.updateMany({ where: { user_id: member.id }, data: { revoked: true } }),
    ]);
    logger.info('Password reset', { email: body.email });
    res.json({ msg: 'Password has been reset successfully. Please log in with your new password.' });
  },
);
