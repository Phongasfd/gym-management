import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser } from '../types/auth';

function decode(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload !== 'object' || payload === null) return null;
    if (payload.userType === 'member' && typeof payload.userId === 'string') {
      return { userType: 'member', userId: payload.userId, needCompleteProfile: payload.needCompleteProfile === true };
    }
    if (payload.userType === 'staff' && typeof payload.staffId === 'string') {
      return { userType: 'staff', staffId: payload.staffId, role: typeof payload.role === 'string' ? payload.role : undefined };
    }
    return null;
  } catch {
    return null;
  }
}

// Any signed-in user (member or staff).
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.access_token;
  if (typeof token !== 'string' || token === '') {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  const auth = decode(token);
  if (!auth) {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
  req.auth = auth;
  next();
}

export function staffMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.userType !== 'staff') {
    res.status(403).json({ message: 'Access denied' });
    return;
  }
  next();
}

export function memberMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.userType !== 'member') {
    res.status(403).json({ message: 'Only members can do this' });
    return;
  }
  next();
}
