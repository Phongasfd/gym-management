import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { utc } from '../../lib/sql';
import { z } from '../../lib/zod';
import { bmi } from '../fitness/nutrition';
import { assertQuota, completeStructured } from './client';

const DAY = 24 * 60 * 60 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;

// All the numbers are computed here, in SQL; the model only interprets them.
export async function collectProgressStats(memberId: string, now = new Date()) {
  const since90 = new Date(now.getTime() - 90 * DAY);
  const since56 = new Date(now.getTime() - 56 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since14 = new Date(now.getTime() - 14 * DAY);

  const [profile, metrics, weekly, muscles, checkins30, plan] = await Promise.all([
    prisma.memberProfile.findUnique({ where: { member_id: memberId } }),
    prisma.bodyMetric.findMany({ where: { member_id: memberId, measured_at: { gte: since90 } }, orderBy: { measured_at: 'asc' } }),
    prisma.$queryRaw<{ week: Date; workouts: number; minutes: number; avg_rpe: number | null }[]>`
      SELECT date_trunc('week', "performed_at") AS "week",
             COUNT(*)::int AS "workouts",
             COALESCE(SUM("duration_minutes"), 0)::int AS "minutes",
             AVG("perceived_effort")::float AS "avg_rpe"
      FROM "WorkoutLog"
      WHERE "member_id" = ${memberId} AND "performed_at" >= ${utc(since56)}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ muscle_group: string; sets: number; volume_kg: number }[]>`
      SELECT e."muscle_group"::text AS "muscle_group",
             COUNT(*)::int AS "sets",
             COALESCE(SUM(s."reps" * COALESCE(s."weight_kg", 0)), 0)::float AS "volume_kg"
      FROM "WorkoutLogSet" s
      JOIN "WorkoutLog" l ON l."id" = s."log_id"
      JOIN "Exercise" e ON e."id" = s."exercise_id"
      WHERE l."member_id" = ${memberId} AND l."performed_at" >= ${utc(since30)}
      GROUP BY 1 ORDER BY 3 DESC`,
    prisma.checkin.count({ where: { member_id: memberId, checkin_time: { gte: since30 } } }),
    prisma.workoutPlan.findFirst({ where: { member_id: memberId, status: 'active' }, select: { id: true, title: true, days_per_week: true } }),
  ]);

  let adherence: { plan: string; expected_sessions_14d: number; done_sessions_14d: number; pct: number } | null = null;
  if (plan) {
    const done = await prisma.workoutLog.count({
      where: { member_id: memberId, performed_at: { gte: since14 }, plan_day: { plan_id: plan.id } },
    });
    const expected = plan.days_per_week * 2;
    adherence = { plan: plan.title, expected_sessions_14d: expected, done_sessions_14d: done, pct: Math.round((done / expected) * 100) };
  }

  const first = metrics[0];
  const last = metrics[metrics.length - 1];
  return {
    goal: profile?.goal ?? null,
    target_weight_kg: profile?.target_weight_kg ?? null,
    body: last
      ? {
          measurements_90d: metrics.length,
          current_weight_kg: last.weight_kg,
          weight_change_kg: round1(last.weight_kg - first.weight_kg),
          body_fat_change_pct:
            last.body_fat_pct !== null && first.body_fat_pct !== null ? round1(last.body_fat_pct - first.body_fat_pct) : null,
          waist_change_cm: last.waist_cm !== null && first.waist_cm !== null ? round1(last.waist_cm - first.waist_cm) : null,
          bmi: profile?.height_cm ? bmi(last.weight_kg, profile.height_cm) : null,
          period_days: Math.round((last.measured_at.getTime() - first.measured_at.getTime()) / DAY),
        }
      : null,
    training_by_week: weekly.map((w) => ({
      week: w.week.toISOString().slice(0, 10),
      workouts: w.workouts,
      minutes: w.minutes,
      avg_rpe: w.avg_rpe === null ? null : round1(w.avg_rpe),
    })),
    volume_by_muscle_30d: muscles.map((m) => ({ ...m, volume_kg: Math.round(m.volume_kg) })),
    gym_visits_30d: checkins30,
    plan_adherence: adherence,
  };
}

const reportSchema = z.object({
  headline: z.string().describe('One encouraging sentence'),
  summary: z.string(),
  wins: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendations: z.array(z.string()).describe('Concrete, actionable next steps for the next 2 weeks'),
});

export async function generateProgressReport(input: { memberId: string; now?: Date }) {
  const { memberId } = input;
  await assertQuota({ memberId }, input.now);
  const stats = await collectProgressStats(memberId, input.now);
  if (!stats.body && stats.training_by_week.length === 0 && stats.gym_visits_30d === 0) {
    throw new AppError('Log some workouts or body measurements first', 422, { code: 'NOT_ENOUGH_DATA' });
  }

  const { data } = await completeStructured({
    feature: 'progress_report',
    actor: { memberId },
    schema: reportSchema,
    name: 'progress_report',
    temperature: 0.4,
    maxTokens: 1200,
    messages: [
      {
        role: 'system',
        content:
          'You are a supportive personal trainer reviewing a member\'s data. Base every statement on the numbers ' +
          'given; do not invent data. Point out muscle-group imbalances, consistency trends, plan adherence and body ' +
          'composition progress relative to the goal. Healthy weight change is roughly 0.25-1% of body weight per ' +
          'week. 2-4 items per list. Write in Vietnamese.',
      },
      { role: 'user', content: JSON.stringify(stats) },
    ],
  });

  return { stats, report: data };
}
