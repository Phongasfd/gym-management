import type { ExperienceLevel } from '@prisma/client';
import { AppError } from '../../lib/AppError';

// Shapes and sanity rules for AI-generated plans. The model output is already schema-valid
// (Structured Outputs); these functions enforce the domain rules a JSON schema cannot.

export function allowedDifficulties(level: ExperienceLevel): ExperienceLevel[] {
  if (level === 'advanced') return ['beginner', 'intermediate', 'advanced'];
  if (level === 'intermediate') return ['beginner', 'intermediate'];
  return ['beginner'];
}

const clampInt = (value: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, value)));

export interface RawPlanExercise {
  exercise_id: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
}
export interface RawPlanDay {
  title: string;
  focus: string | null;
  exercises: RawPlanExercise[];
}
export interface RawWorkoutPlan {
  title: string;
  notes: string | null;
  days: RawPlanDay[];
}

export interface NormalizedWorkoutPlan {
  title: string;
  notes: string | null;
  days: {
    day_index: number;
    title: string;
    focus: string | null;
    exercises: { exercise_id: string; position: number; sets: number; reps: string; rest_seconds: number; notes: string | null }[];
  }[];
}

export function normalizeWorkoutPlan(
  raw: RawWorkoutPlan,
  rules: { daysPerWeek: number; exerciseIds: Set<string>; maxExercisesPerDay?: number },
): NormalizedWorkoutPlan {
  const maxPerDay = rules.maxExercisesPerDay ?? 10;
  const days = raw.days.slice(0, rules.daysPerWeek).map((day, i) => {
    const seen = new Set<string>();
    const exercises = day.exercises
      // unknown ids cannot happen with the enum schema, but never trust the model for referential integrity
      .filter((e) => rules.exerciseIds.has(e.exercise_id) && !seen.has(e.exercise_id) && seen.add(e.exercise_id))
      .slice(0, maxPerDay)
      .map((e, position) => ({
        exercise_id: e.exercise_id,
        position: position + 1,
        sets: clampInt(e.sets, 1, 10),
        reps: e.reps.trim().slice(0, 20) || '10',
        rest_seconds: clampInt(e.rest_seconds, 0, 600),
        notes: e.notes?.trim().slice(0, 300) || null,
      }));
    return {
      day_index: i + 1,
      title: day.title.trim().slice(0, 100) || `Day ${i + 1}`,
      focus: day.focus?.trim().slice(0, 100) || null,
      exercises,
    };
  });

  if (days.length === 0 || days.some((d) => d.exercises.length === 0)) {
    throw new AppError('The AI produced an unusable plan, please try again', 502, { code: 'AI_BAD_OUTPUT' });
  }
  return { title: raw.title.trim().slice(0, 120) || 'Workout plan', notes: raw.notes?.trim().slice(0, 2000) || null, days };
}

export interface RawMeal {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
export interface RawMealPlan {
  title: string;
  notes: string | null;
  days: { meals: RawMeal[] }[];
}

const nonNegative = (n: number, digits = 1) => Math.max(0, Math.round(n * 10 ** digits) / 10 ** digits);

export function normalizeMealPlan(raw: RawMealPlan, rules: { days: number; targetCalories: number }) {
  const days = raw.days.slice(0, rules.days).map((day, i) => {
    const meals = day.meals.slice(0, 6).map((m) => ({
      meal_type: m.meal_type,
      name: m.name.trim().slice(0, 120) || 'Meal',
      description: m.description?.trim().slice(0, 500) || null,
      calories: Math.round(nonNegative(m.calories, 0)),
      protein_g: nonNegative(m.protein_g),
      carbs_g: nonNegative(m.carbs_g),
      fat_g: nonNegative(m.fat_g),
    }));
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein_g: nonNegative(acc.protein_g + m.protein_g),
        carbs_g: nonNegative(acc.carbs_g + m.carbs_g),
        fat_g: nonNegative(acc.fat_g + m.fat_g),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    const deviationPct = Math.round(((totals.calories - rules.targetCalories) / rules.targetCalories) * 1000) / 10;
    return { day_index: i + 1, meals, totals, deviation_pct: deviationPct };
  });

  if (days.length === 0 || days.some((d) => d.meals.length === 0)) {
    throw new AppError('The AI produced an unusable meal plan, please try again', 502, { code: 'AI_BAD_OUTPUT' });
  }
  return { title: raw.title.trim().slice(0, 120) || 'Meal plan', notes: raw.notes?.trim().slice(0, 2000) || null, days };
}
