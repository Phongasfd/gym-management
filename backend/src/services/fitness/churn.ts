import type { ChurnRisk } from '@prisma/client';

// Deterministic churn heuristic. It is stored next to the model's score so staff (and tests) can
// see when the model disagrees, and it is the fallback when the model skips a member.

export interface ChurnFeatures {
  days_since_last_checkin: number;
  checkins_last_14d: number;
  checkins_prev_28d: number;
  days_until_expiry: number | null;
  cancelled_bookings_30d: number;
  workouts_last_14d: number;
  tenure_days: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function baselineChurnScore(f: ChurnFeatures): number {
  let score = 0;

  // Inactivity: 2 points per day without a visit, up to 40.
  score += Math.min(40, f.days_since_last_checkin * 2);

  // Drop in visit frequency versus the four weeks before.
  const recentWeekly = f.checkins_last_14d / 2;
  const previousWeekly = f.checkins_prev_28d / 4;
  if (previousWeekly > 0) score += Math.max(0, 1 - recentWeekly / previousWeekly) * 25;
  else if (recentWeekly === 0) score += 10;

  // Membership about to run out.
  if (f.days_until_expiry !== null) {
    if (f.days_until_expiry <= 7) score += 20;
    else if (f.days_until_expiry <= 14) score += 12;
    else if (f.days_until_expiry <= 30) score += 5;
  }

  score += Math.min(10, f.cancelled_bookings_30d * 3);

  // New members churn more often in their first month.
  if (f.tenure_days < 30) score += 5;

  // Members who log workouts are engaged.
  if (f.workouts_last_14d >= 4) score -= 10;

  return Math.round(clamp(score, 0, 100));
}

export function riskLevel(score: number): ChurnRisk {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// The model's score is trusted most, but anchored to the heuristic so one odd answer cannot flip
// a clearly inactive member to "low".
export function blendScores(modelScore: number, baseline: number): number {
  return Math.round(clamp(0.7 * clamp(modelScore, 0, 100) + 0.3 * baseline, 0, 100));
}
