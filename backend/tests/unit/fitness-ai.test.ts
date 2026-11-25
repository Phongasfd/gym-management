import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from '../../src/lib/zod';
import { estimateCostUsd, startOfUtcDay } from '../../src/services/ai/client';
import { toModelMessages } from '../../src/services/ai/chat.service';
import { toolDefinitions } from '../../src/services/ai/tools';
import { baselineChurnScore, blendScores, riskLevel, type ChurnFeatures } from '../../src/services/fitness/churn';
import { ageInYears, basalMetabolicRate, bmi, computeNutritionTargets } from '../../src/services/fitness/nutrition';
import { allowedDifficulties, normalizeMealPlan, normalizeWorkoutPlan } from '../../src/services/fitness/planRules';

describe('nutrition', () => {
  test('Mifflin-St Jeor BMR', () => {
    expect(basalMetabolicRate({ sex: 'male', ageYears: 30, weightKg: 80, heightCm: 180 })).toBe(1780);
    expect(basalMetabolicRate({ sex: 'female', ageYears: 30, weightKg: 60, heightCm: 165 })).toBeCloseTo(1320.25);
    // unknown sex = midpoint of the two constants
    expect(basalMetabolicRate({ sex: null, ageYears: 30, weightKg: 80, heightCm: 180 })).toBe(1697);
  });

  test('targets: deficit for fat loss, macros add up to the calories', () => {
    const t = computeNutritionTargets({ sex: 'male', ageYears: 30, weightKg: 80, heightCm: 180, activity: 'moderate', goal: 'lose_fat' });
    expect(t.tdee).toBe(Math.round(1780 * 1.55));
    expect(t.calories).toBe(Math.round(1780 * 1.55 * 0.8));
    expect(t.protein_g).toBe(160);
    const fromMacros = t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9;
    expect(Math.abs(fromMacros - t.calories)).toBeLessThan(10);
  });

  test('never prescribes below 1200 kcal', () => {
    const t = computeNutritionTargets({ sex: 'female', ageYears: 70, weightKg: 40, heightCm: 145, activity: 'sedentary', goal: 'lose_fat' });
    expect(t.calories).toBe(1200);
  });

  test('age and BMI', () => {
    expect(ageInYears(new Date('2000-06-15'), new Date('2026-06-14'))).toBe(25);
    expect(ageInYears(new Date('2000-06-15'), new Date('2026-06-15'))).toBe(26);
    expect(bmi(70, 175)).toBe(22.9);
  });
});

describe('churn heuristic', () => {
  const engaged: ChurnFeatures = {
    days_since_last_checkin: 1,
    checkins_last_14d: 8,
    checkins_prev_28d: 14,
    days_until_expiry: 60,
    cancelled_bookings_30d: 0,
    workouts_last_14d: 6,
    tenure_days: 200,
  };

  test('an engaged member is low risk', () => {
    const score = baselineChurnScore(engaged);
    expect(score).toBeLessThan(30);
    expect(riskLevel(score)).toBe('low');
  });

  test('a member who stopped coming and is about to expire is high risk', () => {
    const score = baselineChurnScore({
      ...engaged,
      days_since_last_checkin: 25,
      checkins_last_14d: 0,
      days_until_expiry: 5,
      workouts_last_14d: 0,
      cancelled_bookings_30d: 2,
    });
    expect(score).toBeGreaterThanOrEqual(60);
    expect(riskLevel(score)).toBe('high');
  });

  test('score is clamped to 0-100 and blending anchors the model to the baseline', () => {
    expect(baselineChurnScore({ ...engaged, days_since_last_checkin: 400, checkins_prev_28d: 0, checkins_last_14d: 0, days_until_expiry: 1, cancelled_bookings_30d: 99, workouts_last_14d: 0, tenure_days: 1 })).toBe(85);
    expect(baselineChurnScore({ ...engaged, days_since_last_checkin: 0, checkins_prev_28d: 0, days_until_expiry: null })).toBe(0);
    expect(blendScores(0, 100)).toBe(30);
    expect(blendScores(150, 0)).toBe(70);
    expect(riskLevel(30)).toBe('medium');
  });
});

describe('plan rules', () => {
  test('allowed difficulties grow with experience', () => {
    expect(allowedDifficulties('beginner')).toEqual(['beginner']);
    expect(allowedDifficulties('advanced')).toHaveLength(3);
  });

  test('workout plan: renumbers days, drops extra days, unknown and duplicate exercises, clamps numbers', () => {
    const plan = normalizeWorkoutPlan(
      {
        title: '  Giảm mỡ  ',
        notes: null,
        days: [
          {
            title: 'A',
            focus: null,
            exercises: [
              { exercise_id: 'e1', sets: 50, reps: '8-12', rest_seconds: -5, notes: null },
              { exercise_id: 'e1', sets: 3, reps: '10', rest_seconds: 60, notes: null },
              { exercise_id: 'ghost', sets: 3, reps: '10', rest_seconds: 60, notes: null },
              { exercise_id: 'e2', sets: 3, reps: ' ', rest_seconds: 60, notes: ' ' },
            ],
          },
          { title: 'B', focus: 'Legs', exercises: [{ exercise_id: 'e2', sets: 3, reps: '12', rest_seconds: 90, notes: null }] },
          { title: 'C', focus: null, exercises: [{ exercise_id: 'e1', sets: 3, reps: '12', rest_seconds: 90, notes: null }] },
        ],
      },
      { daysPerWeek: 2, exerciseIds: new Set(['e1', 'e2']) },
    );
    expect(plan.title).toBe('Giảm mỡ');
    expect(plan.days.map((d) => d.day_index)).toEqual([1, 2]);
    expect(plan.days[0].exercises).toEqual([
      { exercise_id: 'e1', position: 1, sets: 10, reps: '8-12', rest_seconds: 0, notes: null },
      { exercise_id: 'e2', position: 2, sets: 3, reps: '10', rest_seconds: 60, notes: null },
    ]);
  });

  test('workout plan with an empty day is rejected', () => {
    expect(() =>
      normalizeWorkoutPlan(
        { title: 'x', notes: null, days: [{ title: 'A', focus: null, exercises: [{ exercise_id: 'ghost', sets: 3, reps: '10', rest_seconds: 60, notes: null }] }] },
        { daysPerWeek: 3, exerciseIds: new Set(['e1']) },
      ),
    ).toThrow(/unusable/);
  });

  test('meal plan: totals and deviation from the target', () => {
    const meal = (calories: number) => ({ meal_type: 'lunch' as const, name: 'Cơm gà', description: null, calories, protein_g: 30.04, carbs_g: 50, fat_g: 10 });
    const plan = normalizeMealPlan({ title: 'Thực đơn', notes: null, days: [{ meals: [meal(1000), meal(1100)] }, { meals: [meal(-5)] }] }, { days: 1, targetCalories: 2000 });
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].totals).toEqual({ calories: 2100, protein_g: 60, carbs_g: 100, fat_g: 20 });
    expect(plan.days[0].deviation_pct).toBe(5);
    expect(() => normalizeMealPlan({ title: 'x', notes: null, days: [{ meals: [] }] }, { days: 1, targetCalories: 2000 })).toThrow();
  });
});

describe('AI plumbing', () => {
  test('cost estimate uses the longest matching model prefix', () => {
    expect(estimateCostUsd('gpt-4o-mini-2024-07-18', 1_000_000, 1_000_000)).toBe(0.75);
    expect(estimateCostUsd('gpt-4o', 1000, 1000)).toBe(0.0125);
    expect(estimateCostUsd('some-local-model', 1000, 1000)).toBe(0);
  });

  test('start of the UTC day', () => {
    expect(startOfUtcDay(new Date('2026-11-25T23:59:00+07:00')).toISOString()).toBe('2026-11-25T00:00:00.000Z');
  });

  test('tool schemas are valid strict function definitions; personal tools need a member', () => {
    const anonymous = toolDefinitions({}).map((t) => t.function.name);
    expect(anonymous).toEqual(['list_packages', 'list_upcoming_classes']);
    const member = toolDefinitions({ memberId: 'm1' });
    expect(member.map((t) => t.function.name)).toEqual(
      expect.arrayContaining(['get_my_membership', 'get_my_bookings', 'get_my_progress', 'book_class', 'cancel_booking']),
    );
    for (const t of member) expect(t.function.strict).toBe(true);
  });

  test('structured output schemas convert to strict JSON schema', () => {
    const format = zodResponseFormat(z.object({ id: z.enum(['a', 'b']), note: z.string().nullable(), n: z.number().int() }), 'x');
    expect(format.json_schema.strict).toBe(true);
    expect(JSON.stringify(format.json_schema.schema)).toContain('"enum":["a","b"]');
  });

  test('stored history never starts in the middle of a tool exchange', () => {
    const messages = toModelMessages([
      { role: 'tool', content: '{}', tool_calls: null, tool_call_id: 'c0' },
      { role: 'assistant', content: 'ok', tool_calls: null, tool_call_id: null },
      { role: 'user', content: 'hi', tool_calls: null, tool_call_id: null },
      { role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'list_packages', arguments: '{}' } }], tool_call_id: null },
      { role: 'tool', content: '[]', tool_calls: null, tool_call_id: 'c1' },
      { role: 'assistant', content: 'Không có gói nào', tool_calls: null, tool_call_id: null },
    ]);
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
    expect(messages[1]).toMatchObject({ content: null, tool_calls: [{ id: 'c1' }] });
    expect(toModelMessages([{ role: 'assistant', content: 'x', tool_calls: null, tool_call_id: null }])).toEqual([]);
  });
});
