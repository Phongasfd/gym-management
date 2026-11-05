import bcrypt from 'bcryptjs';
import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { password } from '../schemas/common';

export const updatePassword = endpoint(
  {
    summary: "Change the current staff member's password",
    auth: 'staff',
    body: z
      .object({ currentPassword: z.string().min(1), newPassword: password, confirm: z.string() })
      .refine((b) => b.newPassword === b.confirm, { path: ['confirm'], message: 'Passwords do not match' }),
  },
  async ({ body, auth, res }) => {
    const user = await prisma.user.findUnique({ where: { id: auth.staffId } });
    if (!user) throw new AppError('User not found', 404);

    if (!(await bcrypt.compare(body.currentPassword, user.password_hash))) {
      throw new AppError('Current password is incorrect', 400);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password_hash: await bcrypt.hash(body.newPassword, 10) } }),
      // Other sessions (another browser, a stolen cookie) must log in again.
      prisma.refreshToken.updateMany({ where: { user_id: user.id }, data: { revoked: true } }),
    ]);
    res.json({ msg: 'Updated successfully' });
  },
);
