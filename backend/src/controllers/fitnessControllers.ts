import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { dateInput, idParams, optional } from '../schemas/common';
import { mealPlanInclude } from '../services/ai/mealPlan.service';
import { PROFILE_DEFAULTS, workoutPlanInclude } from '../services/ai/workoutPlan.service';
import { bmi } from '../services/fitness/nutrition';

// Members' fitness data: profile, body metrics, exercise library, workout plans and logs, meal plans.
// Ranges mirror the CHECK constraints of migration 20261125090000, which stay the last line of defence.

const goal = z.enum(['lose_fat', 'build_muscle', 'improve_endurance', 'general_health']);
const level = z.enum(['beginner', 'intermediate', 'advanced']);
const activity = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
const muscleGroup = z.enum(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio']);
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

// ---------------------------------------------------------------- profile

export const getProfile = endpoint({ summary: 'My fitness profile', auth: 'member' }, async ({ auth, res }) => {
  const [profile, latest] = await Promise.all([
    prisma.memberProfile.findUnique({ where: { member_id: auth.userId } }),
    prisma.bodyMetric.findFirst({ where: { member_id: auth.userId }, orderBy: { measured_at: 'desc' } }),
  ]);
  const p = profile ?? { member_id: auth.userId, ...PROFILE_DEFAULTS };
  res.json({
    ...p,
    is_default: !profile,
    latest_metric: latest,
    bmi: latest && p.height_cm ? bmi(latest.weight_kg, p.height_cm) : null,
  });
});

export const upsertProfile = endpoint(
  {
    summary: 'Create or update my fitness profile',
    auth: 'member',
    body: z.object({
      height_cm: z.number().min(100).max(250).nullable().optional(),
      target_weight_kg: z.number().min(30).max(300).nullable().optional(),
      goal: goal.optional(),
      experience_level: level.optional(),
      activity_level: activity.optional(),
      training_days_per_week: z.number().int().min(1).max(7).optional(),
      session_minutes: z.number().int().min(15).max(240).optional(),
      injuries: nullableText(500),
      dietary_restrictions: nullableText(500),
    }),
  },
  async ({ auth, body, res }) => {
    const profile = await prisma.memberProfile.upsert({
      where: { member_id: auth.userId },
      create: { member_id: auth.userId, ...body },
      update: body,
    });
    res.json(profile);
  },
);

// ---------------------------------------------------------------- body metrics

export const listMetrics = endpoint(
  { summary: 'My body measurements, newest first', auth: 'member', query: pageQuery },
  async ({ auth, query, res }) => {
    const rows = await prisma.bodyMetric.findMany({
      where: { member_id: auth.userId },
      orderBy: [{ measured_at: 'desc' }, { id: 'desc' }],
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const addMetric = endpoint(
  {
    summary: 'Record a body measurement',
    auth: 'member',
    body: z.object({
      measured_at: optional(dateInput),
      weight_kg: z.number().min(25).max(350),
      body_fat_pct: z.number().min(2).max(75).nullable().optional(),
      muscle_mass_kg: z.number().positive().max(200).nullable().optional(),
      waist_cm: z.number().min(30).max(250).nullable().optional(),
      resting_hr: z.number().int().min(25).max(220).nullable().optional(),
      note: nullableText(300),
    }),
    responses: { 201: 'Created' },
  },
  async ({ auth, body, res }) => {
    const metric = await prisma.bodyMetric.create({ data: { ...body, measured_at: body.measured_at ?? new Date(), member_id: auth.userId } });
    res.status(201).json(metric);
  },
);

export const deleteMetric = endpoint(
  { summary: 'Delete one of my body measurements', auth: 'member', params: idParams },
  async ({ auth, params, res }) => {
    const { count } = await prisma.bodyMetric.deleteMany({ where: { id: params.id, member_id: auth.userId } });
    if (count === 0) throw new AppError('Measurement not found', 404);
    res.json({ message: 'Measurement deleted' });
  },
);

// ---------------------------------------------------------------- exercise library

export const listExercises = endpoint(
  {
    summary: 'Exercise library',
    auth: 'public',
    query: z.object({
      muscle_group: muscleGroup.optional(),
      difficulty: level.optional(),
      q: z.string().trim().max(50).optional(),
      include_inactive: z.enum(['true', 'false']).optional(),
    }),
  },
  async ({ query, res }) => {
    const rows = await prisma.exercise.findMany({
      where: {
        muscle_group: query.muscle_group,
        difficulty: query.difficulty,
        is_active: query.include_inactive === 'true' ? undefined : true,
        ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ muscle_group: 'asc' }, { name: 'asc' }],
    });
    res.json(rows);
  },
);

const exerciseBody = z.object({
  name: z.string().trim().min(2).max(100),
  muscle_group: muscleGroup,
  equipment: nullableText(60),
  difficulty: level,
  instructions: nullableText(2000),
  is_active: z.boolean().optional(),
});

export const createExercise = endpoint(
  { summary: 'Add an exercise to the library (staff)', auth: 'staff', body: exerciseBody, responses: { 201: 'Created', 409: 'Name taken' } },
  async ({ body, res }) => {
    try {
      res.status(201).json(await prisma.exercise.create({ data: body }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('An exercise with this name already exists', 409, { code: 'EXERCISE_EXISTS' });
      }
      throw err;
    }
  },
);

export const updateExercise = endpoint(
  { summary: 'Edit or deactivate an exercise (staff)', auth: 'staff', params: idParams, body: exerciseBody.partial() },
  async ({ params, body, res }) => {
    const existing = await prisma.exercise.findUnique({ where: { id: params.id } });
    if (!existing) throw new AppError('Exercise not found', 404);
    res.json(await prisma.exercise.update({ where: { id: params.id }, data: body }));
  },
);

// ---------------------------------------------------------------- workout plans

export const listWorkoutPlans = endpoint(
  {
    summary: 'My workout plans',
    auth: 'member',
    query: z.object({ status: z.enum(['draft', 'active', 'archived']).optional() }),
  },
  async ({ auth, query, res }) => {
    const rows = await prisma.workoutPlan.findMany({
      where: { member_id: auth.userId, status: query.status },
      orderBy: [{ created_at: 'desc' }],
      include: { _count: { select: { days: true } } },
      take: 50,
    });
    res.json(rows);
  },
);

async function ownPlan(memberId: string, planId: string) {
  const plan = await prisma.workoutPlan.findFirst({ where: { id: planId, member_id: memberId }, include: workoutPlanInclude });
  if (!plan) throw new AppError('Workout plan not found', 404);
  return plan;
}

export const getWorkoutPlan = endpoint(
  { summary: 'A workout plan with its days and exercises', auth: 'member', params: idParams },
  async ({ auth, params, res }) => {
    res.json(await ownPlan(auth.userId, params.id));
  },
);

export const activateWorkoutPlan = endpoint(
  {
    summary: 'Start following a plan (archives the current one)',
    description: 'At most one active plan per member, guaranteed by a partial unique index.',
    auth: 'member',
    params: idParams,
    responses: { 200: 'Activated', 404: 'Not found', 409: 'PLAN_ACTIVATION_CONFLICT' },
  },
  async ({ auth, params, res }) => {
    await ownPlan(auth.userId, params.id);
    try {
      await prisma.$transaction([
        prisma.workoutPlan.updateMany({
          where: { member_id: auth.userId, status: 'active', id: { not: params.id } },
          data: { status: 'archived' },
        }),
        prisma.workoutPlan.update({ where: { id: params.id }, data: { status: 'active', activated_at: new Date() } }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('Another plan was activated at the same time, please retry', 409, { code: 'PLAN_ACTIVATION_CONFLICT' });
      }
      throw err;
    }
    res.json(await ownPlan(auth.userId, params.id));
  },
);

export const archiveWorkoutPlan = endpoint(
  { summary: 'Archive one of my plans', auth: 'member', params: idParams },
  async ({ auth, params, res }) => {
    await ownPlan(auth.userId, params.id);
    res.json(await prisma.workoutPlan.update({ where: { id: params.id }, data: { status: 'archived' } }));
  },
);

// ---------------------------------------------------------------- workout logs

export const listWorkoutLogs = endpoint(
  { summary: 'My workout log, newest first', auth: 'member', query: pageQuery },
  async ({ auth, query, res }) => {
    const rows = await prisma.workoutLog.findMany({
      where: { member_id: auth.userId },
      orderBy: [{ performed_at: 'desc' }, { id: 'desc' }],
      include: {
        sets: { orderBy: [{ exercise_id: 'asc' }, { set_number: 'asc' }], include: { exercise: { select: { name: true, muscle_group: true } } } },
        plan_day: { select: { id: true, title: true, plan_id: true } },
      },
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const addWorkoutLog = endpoint(
  {
    summary: 'Log a workout session with its sets',
    auth: 'member',
    body: z.object({
      plan_day_id: z.string().uuid().optional(),
      performed_at: optional(dateInput),
      duration_minutes: z.number().int().min(1).max(600).optional(),
      perceived_effort: z.number().int().min(1).max(10).optional(),
      notes: z.string().trim().max(1000).optional(),
      sets: z
        .array(
          z.object({
            exercise_id: z.string().uuid(),
            set_number: z.number().int().min(1).max(50),
            reps: z.number().int().min(0).max(1000),
            weight_kg: z.number().min(0).max(1000).nullable().optional(),
          }),
        )
        .max(200)
        .default([])
        .refine((sets) => new Set(sets.map((s) => `${s.exercise_id}:${s.set_number}`)).size === sets.length, {
          message: 'Each (exercise_id, set_number) pair must be unique',
        }),
    }),
    responses: { 201: 'Created', 400: 'Unknown exercise or plan day' },
  },
  async ({ auth, body, res }) => {
    if (body.plan_day_id) {
      const day = await prisma.workoutPlanDay.findFirst({ where: { id: body.plan_day_id, plan: { member_id: auth.userId } } });
      if (!day) throw new AppError('Plan day not found in your plans', 400, { code: 'INVALID_PLAN_DAY' });
    }
    const exerciseIds = [...new Set(body.sets.map((s) => s.exercise_id))];
    if (exerciseIds.length > 0) {
      const found = await prisma.exercise.count({ where: { id: { in: exerciseIds } } });
      if (found !== exerciseIds.length) throw new AppError('Unknown exercise in sets', 400, { code: 'INVALID_EXERCISE' });
    }
    const log = await prisma.workoutLog.create({
      data: {
        member_id: auth.userId,
        plan_day_id: body.plan_day_id,
        performed_at: body.performed_at ?? new Date(),
        duration_minutes: body.duration_minutes,
        perceived_effort: body.perceived_effort,
        notes: body.notes,
        sets: { create: body.sets },
      },
      include: { sets: true },
    });
    res.status(201).json(log);
  },
);

// ---------------------------------------------------------------- meal plans

export const listMealPlans = endpoint({ summary: 'My meal plans', auth: 'member' }, async ({ auth, res }) => {
  res.json(await prisma.mealPlan.findMany({ where: { member_id: auth.userId }, orderBy: { created_at: 'desc' }, take: 50 }));
});

export const getMealPlan = endpoint(
  { summary: 'A meal plan with its meals', auth: 'member', params: idParams },
  async ({ auth, params, res }) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: params.id, member_id: auth.userId }, include: mealPlanInclude });
    if (!plan) throw new AppError('Meal plan not found', 404);
    res.json(plan);
  },
);

// ---------------------------------------------------------------- staff view

export const memberFitnessOverview = endpoint(
  { summary: "A member's fitness profile, recent metrics, active plan and latest churn insight (staff)", auth: 'staff', params: idParams },
  async ({ params, res }) => {
    const member = await prisma.member.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        full_name: true,
        email: true,
        profile: true,
        body_metrics: { orderBy: { measured_at: 'desc' }, take: 10 },
        workout_plans: { where: { status: 'active' }, include: workoutPlanInclude, take: 1 },
        insights: { orderBy: { created_at: 'desc' }, take: 1 },
        _count: { select: { workout_logs: true, meal_plans: true, ai_conversations: true } },
      },
    });
    if (!member) throw new AppError('Member not found', 404);
    const { workout_plans, insights, ...rest } = member;
    res.json({ ...rest, active_plan: workout_plans[0] ?? null, latest_insight: insights[0] ?? null });
  },
);
