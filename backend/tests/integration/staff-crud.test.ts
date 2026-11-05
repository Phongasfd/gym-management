import { createApp } from '../../src/app';
import { expireSubscriptions } from '../../src/services/subscriptionService';
import { createClass, createMember, createPackage, prisma, resetDb } from '../helpers/db';
import { asMember, asStaff, client } from '../helpers/http';

// Smoke tests for the staff console endpoints: each one answers, validates and stays in its lane.
const app = createApp();
let staff: Awaited<ReturnType<typeof client>>;

beforeEach(async () => {
  await resetDb();
  staff = await client(app, asStaff());
});
afterAll(() => prisma.$disconnect());

test('members: create, read, update, search, overview', async () => {
  const created = await staff.post('/api/members', { full_name: 'Binh Tran', email: 'binh@example.com', phone: '0912345678', gender: 'female' });
  expect(created.status).toBe(201);
  const id = created.body.id;

  expect((await staff.get(`/api/members/${id}`)).body).toMatchObject({ full_name: 'Binh Tran' });
  expect((await staff.put(`/api/members/${id}`, { phone: '0987654321' })).body).toMatchObject({ phone: '0987654321' });
  expect((await staff.get('/api/members?search=binh')).body.data).toHaveLength(1);
  expect((await staff.get('/api/members?search=nobody')).body.data).toHaveLength(0);
  expect((await staff.get(`/api/members/00000000-0000-4000-8000-000000000000`)).status).toBe(404);

  const overview = await staff.get('/api/members/overview?page=1&limit=10');
  expect(overview.body).toMatchObject({ pagination: { totalItems: 1, totalPages: 1 }, data: [{ name: 'Binh Tran', status: 'none' }] });
});

test('check-ins: record and list newest first', async () => {
  const m = await createMember();
  await staff.post('/api/checkins', { member_id: m.id, checkin_time: '2026-01-01T08:00:00Z', source: 'desk' });
  await staff.post('/api/checkins', { member_id: m.id, source: 'qr' });
  const res = await staff.get(`/api/checkins?member_id=${m.id}`);
  expect(res.body.data.map((c: { source: string }) => c.source)).toEqual(['qr', 'desk']);
});

test('packages: create, get, update, delete', async () => {
  const created = await staff.post('/api/packages', { name: 'Premium', price: '1300000', duration_days: 90, description: '' });
  expect(created.status).toBe(201);
  const id = created.body.id;
  expect((await staff.get(`/api/packages/${id}`)).body).toMatchObject({ name: 'Premium', description: null });
  expect((await staff.patch(`/api/packages/${id}`, { is_active: false })).body).toMatchObject({ is_active: false });
  expect((await staff.delete(`/api/packages/${id}`)).status).toBe(204);
  expect((await staff.get(`/api/packages/${id}`)).status).toBe(404);
});

test('classes: list with seats, today, get, delete', async () => {
  const today = await createClass({ name: 'Morning', schedule_time: new Date(Date.now() + 60 * 60 * 1000) });
  await createClass({ name: 'Next week', schedule_time: new Date(Date.now() + 7 * 86_400_000) });

  const list = await (await client(app)).get('/api/classes');
  expect(list.body.data.map((c: { name: string }) => c.name)).toEqual(['Morning', 'Next week']);
  expect(list.body.data[0]).toMatchObject({ bookedSlots: 0, waitlistCount: 0 });

  const ranged = await (await client(app)).get(`/api/classes?from=${new Date(Date.now() + 2 * 86_400_000).toISOString()}`);
  expect(ranged.body.data.map((c: { name: string }) => c.name)).toEqual(['Next week']);

  expect((await staff.get(`/api/classes/${today.id}`)).body).toMatchObject({ name: 'Morning', bookedSlots: 0 });
  expect((await staff.delete(`/api/classes/${today.id}`)).status).toBe(200);
  expect((await staff.get(`/api/classes/${today.id}`)).status).toBe(404);
});

test("today's classes are computed in Vietnam time", async () => {
  const res = await staff.get('/api/classes/today');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ count: expect.any(Number), totalBookingsToday: 0 });
});

test('bookings: staff list and filter, get one; members see their own with the class', async () => {
  const cls = await createClass();
  const m = await createMember();
  const memberClient = await client(app, asMember(m.id));
  const booking = (await memberClient.post('/api/bookings', { class_id: cls.id })).body;

  expect((await staff.get(`/api/bookings?class_id=${cls.id}&status=active`)).body.data).toHaveLength(1);
  expect((await staff.get(`/api/bookings?status=cancelled`)).body.data).toHaveLength(0);
  expect((await staff.get(`/api/bookings/${booking.id}`)).body).toMatchObject({ id: booking.id });
  expect((await staff.get(`/api/bookings/00000000-0000-4000-8000-000000000000`)).status).toBe(404);

  const mine = await memberClient.get('/api/bookings/me');
  expect(mine.body[0]).toMatchObject({ status: 'active', class: { name: 'Yoga' }, waitlistPosition: null });
});

test('subscriptions: staff list/get/update; members see their own', async () => {
  const pkg = await createPackage();
  const m = await createMember();
  const sub = (await staff.post('/api/subscriptions', { member_id: m.id, package_id: pkg.id })).body;

  expect((await staff.get(`/api/subscriptions?member_id=${m.id}`)).body.data).toHaveLength(1);
  expect((await staff.get(`/api/subscriptions/${sub.id}`)).body).toMatchObject({ status: 'active' });
  expect((await staff.patch(`/api/subscriptions/${sub.id}`, { status: 'expired' })).body).toMatchObject({ status: 'expired' });
  expect((await staff.patch(`/api/subscriptions/${sub.id}`, { status: 'vip' })).status).toBe(400);

  const mine = await (await client(app, asMember(m.id))).get('/api/subscriptions/me');
  expect(mine.body[0]).toMatchObject({ id: sub.id, package: { name: 'Basic 1 Month' } });
});

test('expireSubscriptions only touches active memberships past their end date', async () => {
  const pkg = await createPackage();
  const m = await createMember();
  const past = new Date(Date.now() - 1000);
  await prisma.subscription.createMany({
    data: [
      { member_id: m.id, package_id: pkg.id, status: 'active', end_date: past },
      { member_id: m.id, package_id: pkg.id, status: 'active', end_date: new Date(Date.now() + 86_400_000) },
      { member_id: m.id, package_id: pkg.id, status: 'pending' },
      { member_id: m.id, package_id: pkg.id, status: 'failed', end_date: past },
    ],
  });
  expect(await expireSubscriptions()).toBe(1);
  expect((await prisma.subscription.findMany({ select: { status: true }, orderBy: { status: 'asc' } })).map((s) => s.status).sort()).toEqual(
    ['active', 'expired', 'failed', 'pending'],
  );
});
