import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { z } from '../../lib/zod';
import { ageInYears, computeNutritionTargets } from '../fitness/nutrition';
import { normalizeMealPlan } from '../fitness/planRules';
import { assertQuota, completeStructured } from './client';
import { PROFILE_DEFAULTS } from './workoutPlan.service';

const outputSchema = z.object({
  title: z.string(),
  notes: z.string().nullable().describe('Shopping / preparation tips'),
  days: z.array(
    z.object({
      meals: z.array(
        z.object({
          meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
          name: z.string(),
          description: z.string().nullable().describe('Ingredients with gram amounts'),
          calories: z.number(),
          protein_g: z.number(),
          carbs_g: z.number(),
          fat_g: z.number(),
        }),
      ),
    }),
  ),
});

export const mealPlanInclude = { items: { orderBy: [{ day_index: 'asc' as const }, { meal_type: 'asc' as const }] } };

export async function generateMealPlan(input: { memberId: string; days?: number; preferences?: string; now?: Date }) {
  const now = input.now ?? new Date();
  const { memberId } = input;
  const days = input.days ?? 3;
  await assertQuota({ memberId }, now);

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { profile: true, body_metrics: { orderBy: { measured_at: 'desc' }, take: 1 } },
  });
  if (!member) throw new AppError('Member not found', 404);
  const profile = member.profile ?? PROFILE_DEFAULTS;
  const weight = member.body_metrics[0]?.weight_kg;

  const missing = [
    !member.date_of_birth && 'date_of_birth',
    !profile.height_cm && 'height_cm (fitness profile)',
    !weight && 'weight_kg (body metric)',
  ].filter(Boolean);
  if (missing.length > 0 || !member.date_of_birth || !profile.height_cm || !weight) {
    throw new AppError('Some data is needed to calculate your nutrition targets', 422, {
      code: 'NUTRITION_DATA_MISSING',
      details: { missing },
    });
  }

  const targets = computeNutritionTargets({
    sex: member.gender,
    ageYears: ageInYears(member.date_of_birth, now),
    weightKg: weight,
    heightCm: profile.height_cm,
    activity: profile.activity_level,
    goal: profile.goal,
  });

  const { data, usageId } = await completeStructured({
    feature: 'meal_plan',
    actor: { memberId },
    schema: outputSchema,
    name: 'meal_plan',
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content:
          'You are a sports nutritionist in Vietnam. Create a practical meal plan with common Vietnamese foods ' +
          'available at markets and supermarkets. Each day must total within ±5% of the calorie target and close to ' +
          'the macro targets; 3 main meals plus 0-2 snacks; vary meals between days; strictly respect dietary ' +
          'restrictions and allergies; give realistic macro numbers per meal. Write in Vietnamese.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          days,
          daily_targets: { calories: targets.calories, protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g },
          goal: profile.goal,
          dietary_restrictions: profile.dietary_restrictions,
          preferences: input.preferences ?? null,
        }),
      },
    ],
  });

  const plan = normalizeMealPlan(data, { days, targetCalories: targets.calories });

  const saved = await prisma.mealPlan.create({
    data: {
      member_id: memberId,
      title: plan.title,
      notes: plan.notes,
      days: plan.days.length,
      target_calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      source: 'ai',
      ai_usage_id: usageId,
      items: { create: plan.days.flatMap((d) => d.meals.map((m) => ({ ...m, day_index: d.day_index }))) },
    },
    include: mealPlanInclude,
  });

  return {
    ...saved,
    targets,
    daily_totals: plan.days.map((d) => ({ day_index: d.day_index, ...d.totals, deviation_pct: d.deviation_pct })),
  };
}
