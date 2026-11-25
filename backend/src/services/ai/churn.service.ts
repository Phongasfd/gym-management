import { Prisma } from '@prisma/client';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { utc } from '../../lib/sql';
import { z } from '../../lib/zod';
import { baselineChurnScore, blendScores, riskLevel, type ChurnFeatures } from '../fitness/churn';
import { completeStructured } from './client';

const DAY = 24 * 60 * 60 * 1000;

interface FeatureRow {
  id: string;
  full_name: string;
  created_at: Date;
  last_checkin: Date | null;
  checkins_last_14d: number;
  checkins_prev_28d: number;
  sub_end: Date | null;
  cancelled_bookings_30d: number;
  workouts_last_14d: number;
}

// Behavioural features of members holding an active membership, least recently seen first.
export async function collectChurnFeatures(input: { now?: Date; limit?: number; memberIds?: string[] } = {}) {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 20;
  const d14 = utc(new Date(now.getTime() - 14 * DAY));
  const d30 = utc(new Date(now.getTime() - 30 * DAY));
  const d42 = utc(new Date(now.getTime() - 42 * DAY));
  const filter = input.memberIds?.length ? Prisma.sql`AND m."id" IN (${Prisma.join(input.memberIds)})` : Prisma.empty;

  const rows = await prisma.$queryRaw<FeatureRow[]>`
    SELECT m."id", m."full_name", m."created_at",
      (SELECT MAX(c."checkin_time") FROM "Checkin" c WHERE c."member_id" = m."id") AS "last_checkin",
      (SELECT COUNT(*) FROM "Checkin" c WHERE c."member_id" = m."id" AND c."checkin_time" >= ${d14})::int AS "checkins_last_14d",
      (SELECT COUNT(*) FROM "Checkin" c WHERE c."member_id" = m."id" AND c."checkin_time" >= ${d42} AND c."checkin_time" < ${d14})::int AS "checkins_prev_28d",
      (SELECT MAX(s."end_date") FROM "Subscription" s WHERE s."member_id" = m."id" AND s."status" = 'active') AS "sub_end",
      (SELECT COUNT(*) FROM "Booking" b WHERE b."member_id" = m."id" AND b."status" = 'cancelled' AND b."updated_at" >= ${d30})::int AS "cancelled_bookings_30d",
      (SELECT COUNT(*) FROM "WorkoutLog" w WHERE w."member_id" = m."id" AND w."performed_at" >= ${d14})::int AS "workouts_last_14d"
    FROM "Member" m
    WHERE EXISTS (SELECT 1 FROM "Subscription" s WHERE s."member_id" = m."id" AND s."status" = 'active') ${filter}
    ORDER BY "last_checkin" ASC NULLS FIRST, m."id"
    LIMIT ${limit}`;

  return rows.map((r) => {
    const tenureDays = Math.max(0, Math.floor((now.getTime() - r.created_at.getTime()) / DAY));
    const features: ChurnFeatures = {
      days_since_last_checkin: r.last_checkin ? Math.max(0, Math.floor((now.getTime() - r.last_checkin.getTime()) / DAY)) : tenureDays,
      checkins_last_14d: r.checkins_last_14d,
      checkins_prev_28d: r.checkins_prev_28d,
      days_until_expiry: r.sub_end ? Math.ceil((r.sub_end.getTime() - now.getTime()) / DAY) : null,
      cancelled_bookings_30d: r.cancelled_bookings_30d,
      workouts_last_14d: r.workouts_last_14d,
      tenure_days: tenureDays,
    };
    return { memberId: r.id, firstName: r.full_name.split(' ').pop() ?? r.full_name, features, baseline: baselineChurnScore(features) };
  });
}

function outputSchema(memberIds: [string, ...string[]]) {
  return z.object({
    insights: z.array(
      z.object({
        member_id: z.enum(memberIds),
        risk_score: z.number().int().describe('0-100, probability-like churn risk'),
        summary: z.string().describe('Why, citing the numbers'),
        recommended_action: z.string().describe('What staff should do this week'),
        outreach_message: z.string().describe('Short friendly Zalo/SMS message to the member, Vietnamese, using their first name'),
      }),
    ),
  });
}

export async function runChurnAnalysis(input: { staffId?: string; limit?: number; memberIds?: string[]; now?: Date } = {}) {
  const candidates = await collectChurnFeatures({ now: input.now, limit: input.limit, memberIds: input.memberIds });
  if (candidates.length === 0) return { analyzed: 0, insights: [] };

  const ids = candidates.map((c) => c.memberId) as [string, ...string[]];
  const { data, usageId } = await completeStructured({
    feature: 'churn_insight',
    actor: { staffId: input.staffId },
    schema: outputSchema(ids),
    name: 'churn_insights',
    temperature: 0.3,
    maxTokens: 6000,
    messages: [
      {
        role: 'system',
        content:
          'You are a gym retention analyst. For every member, estimate churn risk (0-100) from the behavioural ' +
          'features: long gaps since the last visit, a falling visit rate (last 14 days vs the 28 days before), ' +
          'membership expiring soon without renewal, cancelled class bookings and low engagement all raise risk; ' +
          'logged workouts lower it. baseline_score is a simple heuristic you may disagree with if you explain why. ' +
          'Return exactly one insight per member. Summaries and actions in Vietnamese, concise.',
      },
      {
        role: 'user',
        content: JSON.stringify(candidates.map((c) => ({ member_id: c.memberId, first_name: c.firstName, baseline_score: c.baseline, ...c.features }))),
      },
    ],
  });

  const byId = new Map(candidates.map((c) => [c.memberId, c]));
  const seen = new Set<string>();
  const rows: Prisma.MemberInsightCreateManyInput[] = [];
  for (const item of data.insights) {
    const candidate = byId.get(item.member_id);
    if (!candidate || seen.has(item.member_id)) continue;
    seen.add(item.member_id);
    const score = blendScores(item.risk_score, candidate.baseline);
    rows.push({
      member_id: item.member_id,
      risk_score: score,
      risk_level: riskLevel(score),
      baseline_score: candidate.baseline,
      features: candidate.features as unknown as Prisma.InputJsonObject,
      summary: item.summary.slice(0, 1000),
      recommended_action: item.recommended_action.slice(0, 1000),
      outreach_message: item.outreach_message.slice(0, 1000),
      ai_usage_id: usageId,
      staff_id: input.staffId,
    });
  }
  if (rows.length < candidates.length) {
    logger.warn('AI skipped some members in churn analysis', { type: 'AI', expected: candidates.length, got: rows.length });
  }

  const insights = await prisma.memberInsight.createManyAndReturn({ data: rows });
  return { analyzed: candidates.length, insights: insights.sort((a, b) => b.risk_score - a.risk_score) };
}
