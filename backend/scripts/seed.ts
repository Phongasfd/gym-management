/*
 * Demo data for local development and the end-to-end tests. Idempotent (upserts).
 *
 *   npm run db:seed
 *
 * Passwords come from SEED_STAFF_PASSWORD / SEED_MEMBER_PASSWORD; the defaults are for local use only.
 */
import type { ExperienceLevel, MuscleGroup } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

// The member portal's pricing cards reference these two package ids.
export const BASIC_PACKAGE_ID = '11111111-1111-1111-1111-111111111111';
export const PREMIUM_PACKAGE_ID = '22222222-2222-2222-2222-222222222222';

const HOUR = 60 * 60 * 1000;

export async function seed() {
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? 'local-staff-password';
  const memberPassword = process.env.SEED_MEMBER_PASSWORD ?? 'local-member-password';

  await prisma.user.upsert({
    where: { email: 'staff@gym.local' },
    update: {},
    create: { email: 'staff@gym.local', full_name: 'Front Desk', role: 'admin', password_hash: await bcrypt.hash(staffPassword, 10) },
  });

  await prisma.package.upsert({
    where: { id: BASIC_PACKAGE_ID },
    update: {},
    create: { id: BASIC_PACKAGE_ID, name: 'Basic 1 Month', price: 500000, duration_days: 30, description: 'Gym equipment only' },
  });
  await prisma.package.upsert({
    where: { id: PREMIUM_PACKAGE_ID },
    update: {},
    create: { id: PREMIUM_PACKAGE_ID, name: 'Premium 3 Months', price: 1300000, duration_days: 90, description: 'Gym + group classes' },
  });

  const member = await prisma.member.upsert({
    where: { email: 'member@gym.local' },
    update: {},
    create: {
      email: 'member@gym.local',
      full_name: 'Demo Member',
      phone: '0900000000',
      gender: 'other',
      date_of_birth: new Date('1998-01-01'),
      isProfileComplete: true,
      password_hash: await bcrypt.hash(memberPassword, 10),
    },
  });

  if ((await prisma.class.count()) === 0) {
    const now = Date.now();
    await prisma.class.createMany({
      data: [
        { name: 'Morning Yoga', coach_name: 'Lan', capacity: 12, schedule_time: new Date(now + 2 * HOUR), end_time: new Date(now + 3 * HOUR) },
        { name: 'HIIT', coach_name: 'Minh', capacity: 1, schedule_time: new Date(now + 4 * HOUR), end_time: new Date(now + 5 * HOUR) },
        { name: 'Boxing', coach_name: 'Huy', capacity: 8, schedule_time: new Date(now + 26 * HOUR), end_time: new Date(now + 27 * HOUR) },
      ],
    });
  }

  await seedExercises();

  // Fitness data for the demo member, so every AI feature works out of the box.
  await prisma.memberProfile.upsert({
    where: { member_id: member.id },
    update: {},
    create: {
      member_id: member.id,
      height_cm: 170,
      target_weight_kg: 65,
      goal: 'lose_fat',
      experience_level: 'beginner',
      activity_level: 'light',
      training_days_per_week: 3,
      session_minutes: 60,
      dietary_restrictions: 'Không ăn được hải sản có vỏ',
    },
  });
  if ((await prisma.bodyMetric.count({ where: { member_id: member.id } })) === 0) {
    const now = Date.now();
    await prisma.bodyMetric.createMany({
      data: [
        { member_id: member.id, measured_at: new Date(now - 56 * DAY), weight_kg: 72.4, body_fat_pct: 26.5, waist_cm: 88 },
        { member_id: member.id, measured_at: new Date(now - 28 * DAY), weight_kg: 71.1, body_fat_pct: 25.6, waist_cm: 86.5 },
        { member_id: member.id, measured_at: new Date(now - 1 * DAY), weight_kg: 70.2, body_fat_pct: 24.9, waist_cm: 85 },
      ],
    });
  }
  return { memberId: member.id };
}

const DAY = 24 * HOUR;

// [name, muscle group, equipment, difficulty]
const EXERCISES: [string, MuscleGroup, string | null, ExperienceLevel][] = [
  ['Push-up', 'chest', null, 'beginner'],
  ['Incline Push-up', 'chest', 'bench', 'beginner'],
  ['Dumbbell Bench Press', 'chest', 'dumbbell', 'beginner'],
  ['Barbell Bench Press', 'chest', 'barbell', 'intermediate'],
  ['Incline Dumbbell Press', 'chest', 'dumbbell', 'intermediate'],
  ['Cable Fly', 'chest', 'cable', 'intermediate'],
  ['Lat Pulldown', 'back', 'machine', 'beginner'],
  ['Seated Cable Row', 'back', 'cable', 'beginner'],
  ['One-arm Dumbbell Row', 'back', 'dumbbell', 'beginner'],
  ['Pull-up', 'back', 'pull-up bar', 'intermediate'],
  ['Barbell Row', 'back', 'barbell', 'intermediate'],
  ['Deadlift', 'back', 'barbell', 'advanced'],
  ['Bodyweight Squat', 'legs', null, 'beginner'],
  ['Goblet Squat', 'legs', 'dumbbell', 'beginner'],
  ['Leg Press', 'legs', 'machine', 'beginner'],
  ['Walking Lunge', 'legs', 'dumbbell', 'beginner'],
  ['Glute Bridge', 'legs', null, 'beginner'],
  ['Romanian Deadlift', 'legs', 'barbell', 'intermediate'],
  ['Barbell Back Squat', 'legs', 'barbell', 'intermediate'],
  ['Bulgarian Split Squat', 'legs', 'dumbbell', 'intermediate'],
  ['Front Squat', 'legs', 'barbell', 'advanced'],
  ['Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'beginner'],
  ['Lateral Raise', 'shoulders', 'dumbbell', 'beginner'],
  ['Face Pull', 'shoulders', 'cable', 'beginner'],
  ['Overhead Barbell Press', 'shoulders', 'barbell', 'intermediate'],
  ['Dumbbell Biceps Curl', 'arms', 'dumbbell', 'beginner'],
  ['Triceps Rope Pushdown', 'arms', 'cable', 'beginner'],
  ['Hammer Curl', 'arms', 'dumbbell', 'beginner'],
  ['Bench Dip', 'arms', 'bench', 'intermediate'],
  ['Plank', 'core', null, 'beginner'],
  ['Dead Bug', 'core', null, 'beginner'],
  ['Bird Dog', 'core', null, 'beginner'],
  ['Hanging Knee Raise', 'core', 'pull-up bar', 'intermediate'],
  ['Ab Wheel Rollout', 'core', 'ab wheel', 'advanced'],
  ['Kettlebell Swing', 'full_body', 'kettlebell', 'intermediate'],
  ['Burpee', 'full_body', null, 'intermediate'],
  ['Clean and Press', 'full_body', 'barbell', 'advanced'],
  ['Treadmill Brisk Walk', 'cardio', 'treadmill', 'beginner'],
  ['Stationary Bike', 'cardio', 'bike', 'beginner'],
  ['Rowing Machine', 'cardio', 'rower', 'beginner'],
  ['Jump Rope', 'cardio', 'rope', 'intermediate'],
  ['Treadmill Intervals', 'cardio', 'treadmill', 'advanced'],
];

export async function seedExercises() {
  await prisma.exercise.createMany({
    data: EXERCISES.map(([name, muscle_group, equipment, difficulty]) => ({ name, muscle_group, equipment, difficulty })),
    skipDuplicates: true,
  });
}

if (require.main === module) {
  seed()
    .then(() => console.log('Seeded: staff@gym.local, member@gym.local, 2 packages, 3 classes, exercise library, demo fitness data'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
