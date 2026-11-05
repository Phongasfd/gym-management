import type { ZodTypeAny } from 'zod';
import { z } from '../lib/zod';

export const idParams = z.object({ id: z.string().uuid() });

// HTML forms send "" for an untouched optional field; treat it as "not provided".
export function optional<T extends ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
}

// Accepts ISO strings and the `datetime-local` value an HTML form sends ("2026-11-05T18:30").
export const dateInput = z.coerce.date();

// Not lower-cased: existing accounts were stored as typed, and login looks them up exactly.
export const email = z.string().trim().email().max(254);
export const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
export const gender = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['male', 'female', 'other']),
);
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{8,15}$/, 'Invalid phone number');
export const name = z.string().trim().min(1).max(120);
