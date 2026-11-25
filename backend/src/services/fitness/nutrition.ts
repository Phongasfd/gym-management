import type { ActivityLevel, FitnessGoal } from '@prisma/client';

// Deterministic nutrition maths. The AI only distributes food inside these numbers; it never
// decides how much a member should eat.

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUST: Record<FitnessGoal, number> = {
  lose_fat: -0.2,
  build_muscle: 0.1,
  improve_endurance: 0.05,
  general_health: 0,
};

// grams of protein per kg of body weight
const PROTEIN_PER_KG: Record<FitnessGoal, number> = {
  lose_fat: 2.0,
  build_muscle: 1.8,
  improve_endurance: 1.5,
  general_health: 1.4,
};

export interface NutritionInput {
  sex: string | null; // 'male' | 'female' | 'other' | null
  ageYears: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: FitnessGoal;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Mifflin-St Jeor. For 'other'/unknown sex the midpoint of the two constants is used.
export function basalMetabolicRate({ sex, ageYears, weightKg, heightCm }: Pick<NutritionInput, 'sex' | 'ageYears' | 'weightKg' | 'heightCm'>) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const sexConstant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return base + sexConstant;
}

export function computeNutritionTargets(input: NutritionInput): NutritionTargets {
  const bmr = basalMetabolicRate(input);
  const tdee = bmr * ACTIVITY_FACTOR[input.activity];
  // Never prescribe below 1200 kcal: aggressive deficits are a medical decision, not ours.
  const calories = Math.max(1200, Math.round(tdee * (1 + GOAL_CALORIE_ADJUST[input.goal])));
  const protein = Math.round(input.weightKg * PROTEIN_PER_KG[input.goal]);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein_g: protein, carbs_g: carbs, fat_g: fat };
}

export function ageInYears(dateOfBirth: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() && now.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}
