import type { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';

// Integration tests run against a real PostgreSQL (DATABASE_URL), migrated with `prisma migrate deploy`.
// To make sure nobody points them at a real database by mistake, the database name must contain "test".
function assertTestDatabase() {
  const url = process.env.DATABASE_URL ?? '';
  const dbName = url.split('/').pop()?.split('?')[0] ?? '';
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to wipe database "${dbName}": integration tests need a database whose name contains "test".`);
  }
}

export async function resetDb() {
  assertTestDatabase();
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OutboxEvent", "Booking", "Checkin", "Subscription", "RefreshToken", "Class", "Package", "Member", "User" CASCADE',
  );
}

let seq = 0;
const unique = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export async function createMember(data: Partial<Prisma.MemberCreateInput> = {}) {
  return prisma.member.create({
    data: { full_name: 'Test Member', email: `member-${unique()}@example.com`, ...data },
  });
}

export async function createMembers(n: number) {
  return Promise.all(Array.from({ length: n }, (_, i) => createMember({ full_name: `Member ${i + 1}` })));
}

export async function createClass(data: Partial<Prisma.ClassCreateInput> = {}) {
  return prisma.class.create({
    data: {
      name: 'Yoga',
      capacity: 10,
      schedule_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ...data,
    },
  });
}

export async function createPackage(data: Partial<Prisma.PackageCreateInput> = {}) {
  return prisma.package.create({ data: { name: 'Basic 1 Month', price: 500000, duration_days: 30, ...data } });
}

export async function classState(classId: string) {
  const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
  const active = await prisma.booking.count({ where: { class_id: classId, status: 'active' } });
  const waitlisted = await prisma.booking.count({ where: { class_id: classId, status: 'waitlisted' } });
  return { bookedCount: cls.booked_count, capacity: cls.capacity, active, waitlisted };
}

export { prisma };
