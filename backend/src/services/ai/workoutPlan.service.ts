import type { MemberProfile } from '@prisma/client';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { z } from '../../lib/zod';
import { allowedDifficulties, normalizeWorkoutPlan } from '../fitness/planRules';
import { assertQuota, completeStructured } from './client';

export type ProfileLike = Pick<
  MemberProfile,
  | 'goal'
  | 'experience_level'
  | 'activity_level'
  | 'training_days_per_week'
  | 'session_minutes'
  | 'height_cm'
  | 'target_weight_kg'
  | 'injuries'
  | 'dietary_restrictions'
>;

// Used when a member asks for a plan before filling in their profile.
export const PROFILE_DEFAULTS: ProfileLike = {
  goal: 'general_health',
  experience_level: 'beginner',
  activity_level: 'moderate',
  training_days_per_week: 3,
  session_minutes: 60,
  height_cm: null,
  target_weight_kg: null,
  injuries: null,
  dietary_restrictions: null,
};

export const workoutPlanInclude = {
  days: {
    orderBy: { day_index: 'asc' as const },
    include: {
      exercises: {
        orderBy: { position: 'asc' as const },
        include: { exercise: { select: { id: true, name: true, muscle_group: true, equipment: true } } },
      },
    },
  },
};

// Built per request: exercise_id is an enum of the ids the member may get, so Structured Outputs
// makes it impossible for the model to reference an exercise that does not exist.
function outputSchema(exerciseIds: [string, ...string[]]) {
  return z.object({
    title: z.string(),
    notes: z.string().nullable().describe('Progression guidance, warm-up advice, safety notes'),
    days: z.array(
      z.object({
        title: z.string().describe('e.g. "Upper body push"'),
        focus: z.string().nullable(),
        exercises: z.array(
          z.object({
            exercise_id: z.enum(exerciseIds),
            sets: z.number().int(),
            reps: z.string().describe('e.g. "8-12" or "45s"'),
            rest_seconds: z.number().int(),
            notes: z.string().nullable(),
          }),
        ),
      }),
    ),
  });
}

export async function generateWorkoutPlan(input: { memberId: string; weeks?: number; request?: string; now?: Date }) {
  const { memberId } = input;
  const weeks = input.weeks ?? 4;
  await assertQuota({ memberId }, input.now);

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { profile: true, body_metrics: { orderBy: { measured_at: 'desc' }, take: 1 } },
  });
  if (!member) throw new AppError('Member not found', 404);
  const profile = member.profile ?? PROFILE_DEFAULTS;
  const metric = member.body_metrics[0];

  const exercises = await prisma.exercise.findMany({
    where: { is_active: true, difficulty: { in: allowedDifficulties(profile.experience_level) } },
    orderBy: [{ muscle_group: 'asc' }, { name: 'asc' }],
  });
  if (exercises.length < 5) {
    throw new AppError('The exercise library is too small to build a plan; ask staff to add exercises', 409, {
      code: 'EXERCISE_LIBRARY_EMPTY',
    });
  }
  const ids = exercises.map((e) => e.id) as [string, ...string[]];

  const memberContext = {
    gender: member.gender,
    goal: profile.goal,
    experience_level: profile.experience_level,
    training_days_per_week: profile.training_days_per_week,
    session_minutes: profile.session_minutes,
    height_cm: profile.height_cm,
    weight_kg: metric?.weight_kg ?? null,
    body_fat_pct: metric?.body_fat_pct ?? null,
    target_weight_kg: profile.target_weight_kg,
    injuries_or_limitations: profile.injuries,
    plan_length_weeks: weeks,
    extra_request: input.request ?? null,
  };
  const library = exercises.map((e) => `${e.id} | ${e.name} | ${e.muscle_group} | ${e.equipment ?? 'none'} | ${e.difficulty}`).join('\n');

  const { data, usageId } = await completeStructured({
    feature: 'workout_plan',
    actor: { memberId },
    schema: outputSchema(ids),
    name: 'workout_plan',
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content:
          'You are an experienced strength & conditioning coach. Build a weekly training split that repeats for the ' +
          'given number of weeks. Rules: exactly training_days_per_week days; 4-8 exercises per day that fit in ' +
          'session_minutes; balance muscle groups across the week; respect injuries (avoid loading injured areas); ' +
          'beginner = simpler movements and fewer sets; pick ONLY exercise ids from the library; ' +
          'sets 1-6, rest 30-180 seconds; explain progression (e.g. add reps then weight) in notes. Write titles and ' +
          'notes in Vietnamese.',
      },
      { role: 'user', content: `Member:\n${JSON.stringify(memberContext)}\n\nExercise library (id | name | muscle | equipment | difficulty):\n${library}` },
    ],
  });

  const plan = normalizeWorkoutPlan(data, { daysPerWeek: profile.training_days_per_week, exerciseIds: new Set(ids) });

  return prisma.workoutPlan.create({
    data: {
      member_id: memberId,
      title: plan.title,
      notes: plan.notes,
      goal: profile.goal,
      weeks,
      days_per_week: plan.days.length,
      status: 'draft',
      source: 'ai',
      ai_usage_id: usageId,
      days: {
        create: plan.days.map((d) => ({
          day_index: d.day_index,
          title: d.title,
          focus: d.focus,
          exercises: { create: d.exercises },
        })),
      },
    },
    include: workoutPlanInclude,
  });
}
