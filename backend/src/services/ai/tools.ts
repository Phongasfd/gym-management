import { zodFunction } from 'openai/helpers/zod';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../../lib/AppError';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { z } from '../../lib/zod';
import * as bookings from '../booking/bookingService';

// Tools the chatbot can call. They answer from the real database, so the model never has to
// guess prices, schedules or a member's status, and can act (book / cancel) through the same
// services the REST API uses, with all their concurrency guarantees.

export interface ToolContext {
  memberId?: string;
  now: Date;
}

interface ToolDef<S extends ZodTypeAny> {
  name: string;
  description: string;
  parameters: S;
  memberOnly: boolean;
  run(args: z.output<S>, ctx: ToolContext & { memberId: string | undefined }): Promise<unknown>;
}

const DAY = 24 * 60 * 60 * 1000;

function tool<S extends ZodTypeAny>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

const memberId = (ctx: ToolContext) => ctx.memberId as string;

const TOOLS = [
  tool({
    name: 'list_packages',
    description: 'List the membership packages currently on sale, with price in VND and duration.',
    parameters: z.object({}),
    memberOnly: false,
    async run() {
      const rows = await prisma.package.findMany({ where: { is_active: true }, orderBy: { price: 'asc' } });
      return rows.map((p) => ({ id: p.id, name: p.name, description: p.description, price_vnd: Number(p.price), duration_days: p.duration_days }));
    },
  }),

  tool({
    name: 'list_upcoming_classes',
    description: 'List group classes starting in the next days, with coach, time and free seats.',
    parameters: z.object({
      days_ahead: z.number().nullable().describe('How many days ahead to look, 1-30. Null = 7.'),
      name_contains: z.string().nullable().describe('Optional case-insensitive filter on the class name, e.g. "yoga".'),
    }),
    memberOnly: false,
    async run(args, ctx) {
      const days = Math.min(30, Math.max(1, Math.round(args.days_ahead ?? 7)));
      const rows = await prisma.class.findMany({
        where: {
          schedule_time: { gt: ctx.now, lte: new Date(ctx.now.getTime() + days * DAY) },
          ...(args.name_contains ? { name: { contains: args.name_contains, mode: 'insensitive' as const } } : {}),
        },
        orderBy: { schedule_time: 'asc' },
        take: 25,
      });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        coach: c.coach_name,
        starts_at: c.schedule_time?.toISOString() ?? null,
        ends_at: c.end_time?.toISOString() ?? null,
        seats_left: Math.max(0, c.capacity - c.booked_count),
        is_full: c.booked_count >= c.capacity,
      }));
    },
  }),

  tool({
    name: 'get_my_membership',
    description: "The signed-in member's memberships (active, pending, recent) and days left.",
    parameters: z.object({}),
    memberOnly: true,
    async run(_args, ctx) {
      const subs = await prisma.subscription.findMany({
        where: { member_id: memberId(ctx) },
        include: { package: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
        take: 5,
      });
      return subs.map((s) => ({
        package: s.package.name,
        status: s.status,
        start_date: s.start_date?.toISOString() ?? null,
        end_date: s.end_date?.toISOString() ?? null,
        days_left: s.status === 'active' && s.end_date ? Math.max(0, Math.ceil((s.end_date.getTime() - ctx.now.getTime()) / DAY)) : null,
      }));
    },
  }),

  tool({
    name: 'get_my_bookings',
    description: "The signed-in member's upcoming class bookings and waitlist positions.",
    parameters: z.object({}),
    memberOnly: true,
    async run(_args, ctx) {
      const rows = await bookings.listMemberBookings(memberId(ctx));
      return rows
        .filter((b) => b.status !== 'cancelled' && (!b.class.schedule_time || b.class.schedule_time > ctx.now))
        .map((b) => ({
          booking_id: b.id,
          class: b.class.name,
          starts_at: b.class.schedule_time?.toISOString() ?? null,
          status: b.status,
          waitlist_position: b.waitlistPosition,
        }));
    },
  }),

  tool({
    name: 'get_my_progress',
    description: "The signed-in member's fitness profile, latest body measurements, recent training and gym visits, and active workout plan.",
    parameters: z.object({}),
    memberOnly: true,
    async run(_args, ctx) {
      const id = memberId(ctx);
      const since = new Date(ctx.now.getTime() - 30 * DAY);
      const [profile, metrics, workouts, checkins, plan] = await Promise.all([
        prisma.memberProfile.findUnique({ where: { member_id: id } }),
        prisma.bodyMetric.findMany({ where: { member_id: id }, orderBy: { measured_at: 'desc' }, take: 5 }),
        prisma.workoutLog.count({ where: { member_id: id, performed_at: { gte: since } } }),
        prisma.checkin.count({ where: { member_id: id, checkin_time: { gte: since } } }),
        prisma.workoutPlan.findFirst({ where: { member_id: id, status: 'active' }, select: { id: true, title: true, days_per_week: true } }),
      ]);
      return {
        profile: profile && {
          goal: profile.goal,
          experience_level: profile.experience_level,
          height_cm: profile.height_cm,
          target_weight_kg: profile.target_weight_kg,
          training_days_per_week: profile.training_days_per_week,
          injuries: profile.injuries,
        },
        body_metrics: metrics.map((m) => ({
          measured_at: m.measured_at.toISOString().slice(0, 10),
          weight_kg: m.weight_kg,
          body_fat_pct: m.body_fat_pct,
          waist_cm: m.waist_cm,
        })),
        workouts_logged_last_30d: workouts,
        gym_visits_last_30d: checkins,
        active_plan: plan,
      };
    },
  }),

  tool({
    name: 'book_class',
    description:
      'Book a class for the signed-in member (or join its waitlist). Call first with confirmed=false to get the details, ' +
      'tell the member, and call again with confirmed=true only after they explicitly agree.',
    parameters: z.object({
      class_id: z.string().describe('Class id from list_upcoming_classes'),
      join_waitlist: z.boolean().describe('Join the waitlist if the class is full'),
      confirmed: z.boolean().describe('True only after the member explicitly confirmed this booking'),
    }),
    memberOnly: true,
    async run(args, ctx) {
      const cls = await prisma.class.findUnique({ where: { id: args.class_id } });
      if (!cls) return { error: 'CLASS_NOT_FOUND' };
      const summary = {
        class: cls.name,
        coach: cls.coach_name,
        starts_at: cls.schedule_time?.toISOString() ?? null,
        seats_left: Math.max(0, cls.capacity - cls.booked_count),
      };
      if (!args.confirmed) return { status: 'confirmation_required', ...summary };
      const result = await bookings.bookClass({ memberId: memberId(ctx), classId: cls.id, joinWaitlist: args.join_waitlist });
      return { status: result.outcome, booking_id: result.booking.id, waitlist_position: result.waitlistPosition ?? null, ...summary };
    },
  }),

  tool({
    name: 'cancel_booking',
    description:
      'Cancel one of the signed-in member\'s bookings (or leave a waitlist). Call with confirmed=false first, and with ' +
      'confirmed=true only after the member explicitly agrees.',
    parameters: z.object({
      booking_id: z.string().describe('booking_id from get_my_bookings'),
      confirmed: z.boolean(),
    }),
    memberOnly: true,
    async run(args, ctx) {
      const booking = await prisma.booking.findFirst({
        where: { id: args.booking_id, member_id: memberId(ctx) },
        include: { class: { select: { name: true, schedule_time: true } } },
      });
      if (!booking) return { error: 'BOOKING_NOT_FOUND' };
      const summary = { class: booking.class.name, starts_at: booking.class.schedule_time?.toISOString() ?? null, booking_status: booking.status };
      if (!args.confirmed) return { status: 'confirmation_required', ...summary };
      await bookings.cancelBooking({ bookingId: booking.id, actor: { userType: 'member', userId: memberId(ctx) } });
      return { status: 'cancelled', ...summary };
    },
  }),
];

export type ToolName = (typeof TOOLS)[number]['name'];

export function toolDefinitions(ctx: Pick<ToolContext, 'memberId'>): ChatCompletionTool[] {
  return TOOLS.filter((t) => !t.memberOnly || ctx.memberId).map((t) =>
    zodFunction({ name: t.name, description: t.description, parameters: t.parameters as never }),
  );
}

// Never throws: whatever happens is returned to the model as data so it can explain it.
export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<unknown> {
  const def = TOOLS.find((t) => t.name === name);
  if (!def) return { error: 'UNKNOWN_TOOL' };
  if (def.memberOnly && !ctx.memberId) return { error: 'LOGIN_REQUIRED', message: 'The user must sign in to use this.' };

  let json: unknown;
  try {
    json = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { error: 'INVALID_ARGUMENTS' };
  }
  const parsed = def.parameters.safeParse(json);
  if (!parsed.success) return { error: 'INVALID_ARGUMENTS', issues: parsed.error.issues.map((i) => i.message) };

  try {
    return await (def.run as (args: unknown, ctx: ToolContext) => Promise<unknown>)(parsed.data, ctx);
  } catch (err) {
    if (err instanceof AppError) return { error: err.code ?? 'ERROR', message: err.message };
    logger.error('AI tool failed', { type: 'AI', tool: name, error: err instanceof Error ? err.message : String(err) });
    return { error: 'INTERNAL_ERROR' };
  }
}
