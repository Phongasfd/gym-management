/*
 * Demo data for local development and the end-to-end tests. Idempotent (upserts).
 *
 *   npm run db:seed
 *
 * Passwords come from SEED_STAFF_PASSWORD / SEED_MEMBER_PASSWORD; the defaults are for local use only.
 */
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
  return { memberId: member.id };
}

if (require.main === module) {
  seed()
    .then(() => console.log('Seeded: staff@gym.local, member@gym.local, 2 packages, 3 classes'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
