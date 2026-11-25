import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { seedExercises } from '../../scripts/seed';
import { createClass, createMember, createPackage, prisma, resetDb } from '../helpers/db';
import { asMember, asStaff, client } from '../helpers/http';
import { fakeOpenAI, resetOpenAI, schemaEnum } from '../helpers/openai';

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;
const defaultLimit = env.ai.memberDailyLimit;

beforeEach(resetDb);
afterEach(() => {
  resetOpenAI();
  env.ai.memberDailyLimit = defaultLimit;
});
afterAll(() => prisma.$disconnect());

async function memberWithFitnessData() {
  const m = await createMember({ gender: 'male', date_of_birth: new Date('1996-03-10') });
  await prisma.memberProfile.create({
    data: { member_id: m.id, height_cm: 175, goal: 'build_muscle', experience_level: 'beginner', training_days_per_week: 3 },
  });
  await prisma.bodyMetric.create({ data: { member_id: m.id, weight_kg: 70, body_fat_pct: 18 } });
  return m;
}

describe('POST /api/ai/chat', () => {
  test('anonymous: the model looks up real packages through a tool; nothing is stored', async () => {
    await createPackage({ name: 'Gold 6 Months', price: 2500000, duration_days: 180 });
    const ai = fakeOpenAI([{ toolCalls: [{ name: 'list_packages', args: {} }] }, { content: 'Gói Gold 6 tháng giá 2.500.000đ.' }]);

    const res = await (await client(app)).post('/api/ai/chat', { messages: [{ role: 'user', content: 'Gym có gói nào?' }] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Gói Gold 6 tháng giá 2.500.000đ.', conversation_id: null });
    expect(res.body.actions[0]).toMatchObject({ tool: 'list_packages', result: [{ name: 'Gold 6 Months', price_vnd: 2500000 }] });
    // anonymous users only get the public tools
    expect(ai.requests[0].tools?.map((t) => t.function.name)).toEqual(['list_packages', 'list_upcoming_classes']);
    // the second request carries the tool result back to the model
    expect(ai.requests[1].messages.at(-1)).toMatchObject({ role: 'tool' });
    expect(await prisma.aiUsageLog.count({ where: { feature: 'chat', status: 'success' } })).toBe(2);
    expect(await prisma.aiConversation.count()).toBe(0);
  });

  test('member: books a class through the booking service and the conversation is stored and continued', async () => {
    const m = await createMember();
    const cls = await createClass({ name: 'Boxing', capacity: 5 });
    fakeOpenAI([
      { toolCalls: [{ name: 'book_class', args: { class_id: cls.id, join_waitlist: false, confirmed: true } }] },
      { content: 'Đã đặt lớp Boxing cho bạn!' },
    ]);
    const c = await client(app, asMember(m.id));

    const first = await c.post('/api/ai/chat', { messages: [{ role: 'user', content: 'Có, đặt lớp Boxing giúp mình' }] });

    expect(first.status).toBe(200);
    expect(first.body.actions[0].result).toMatchObject({ status: 'booked', class: 'Boxing' });
    expect(await prisma.booking.count({ where: { member_id: m.id, class_id: cls.id, status: 'active' } })).toBe(1);
    expect((await prisma.class.findUniqueOrThrow({ where: { id: cls.id } })).booked_count).toBe(1);
    const conversationId = first.body.conversation_id as string;
    expect(await prisma.aiMessage.count({ where: { conversation_id: conversationId } })).toBe(4); // user, assistant(tool_calls), tool, assistant

    const ai = fakeOpenAI([{ content: 'Lớp bắt đầu vào ngày mai.' }]);
    const second = await c.post('/api/ai/chat', { messages: [{ role: 'user', content: 'Lớp đó lúc mấy giờ?' }], conversation_id: conversationId });
    expect(second.status).toBe(200);
    expect(second.body.conversation_id).toBe(conversationId);
    // the stored tool exchange is replayed to the model in order, then the new question
    expect(ai.requests[0].messages.map((msg) => msg.role)).toEqual(['system', 'user', 'assistant', 'tool', 'assistant', 'user']);

    const conv = await c.get(`/api/ai/conversations/${conversationId}`);
    expect(conv.body.messages.map((msg: { role: string }) => msg.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect((await c.get('/api/ai/conversations')).body.data).toHaveLength(1);
    expect((await c.delete(`/api/ai/conversations/${conversationId}`)).status).toBe(200);
    expect(await prisma.aiMessage.count()).toBe(0);
  });

  test("a member cannot continue someone else's conversation", async () => {
    const owner = await createMember();
    const other = await createMember();
    const conv = await prisma.aiConversation.create({ data: { member_id: owner.id } });
    fakeOpenAI([{ content: 'x' }]);
    const res = await (await client(app, asMember(other.id))).post('/api/ai/chat', {
      messages: [{ role: 'user', content: 'hi' }],
      conversation_id: conv.id,
    });
    expect(res.status).toBe(404);
  });

  test('booking without confirmation does not book', async () => {
    const m = await createMember();
    const cls = await createClass();
    fakeOpenAI([{ toolCalls: [{ name: 'book_class', args: { class_id: cls.id, join_waitlist: false, confirmed: false } }] }, { content: 'Bạn xác nhận đặt lớp nhé?' }]);
    const res = await (await client(app, asMember(m.id))).post('/api/ai/chat', { messages: [{ role: 'user', content: 'đặt lớp yoga' }] });
    expect(res.body.actions[0].result).toMatchObject({ status: 'confirmation_required' });
    expect(await prisma.booking.count()).toBe(0);
  });

  test('daily quota per member', async () => {
    env.ai.memberDailyLimit = 1;
    const m = await createMember();
    await prisma.aiUsageLog.create({ data: { feature: 'chat', model: 'gpt-4o-mini', member_id: m.id, status: 'success' } });
    fakeOpenAI([{ content: 'x' }]);
    const res = await (await client(app, asMember(m.id))).post('/api/ai/chat', { messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('AI_QUOTA_EXCEEDED');
  });

  test('an upstream failure is a 502 and is recorded', async () => {
    fakeOpenAI([{ error: 'connection reset' }]);
    const res = await (await client(app)).post('/api/ai/chat', { messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('AI_UPSTREAM_ERROR');
    expect(await prisma.aiUsageLog.findFirst()).toMatchObject({ status: 'error', error: 'connection reset' });
  });
});

describe('AI workout plan', () => {
  test('generates a plan from library exercises only, then activation keeps one active plan', async () => {
    await seedExercises();
    const m = await memberWithFitnessData();
    const replyWithPlan = (body: Parameters<typeof schemaEnum>[0]) => {
      const ids = schemaEnum(body, 'exercise_id');
      const day = (title: string, offset: number) => ({
        title,
        focus: null,
        exercises: [0, 1, 2, 3].map((i) => ({ exercise_id: ids[(offset + i) % ids.length], sets: 3, reps: '10-12', rest_seconds: 90, notes: null })),
      });
      return { json: { title: 'Tăng cơ 3 buổi', notes: 'Tăng tạ khi làm đủ 12 lần', days: [day('Ngày 1', 0), day('Ngày 2', 4), day('Ngày 3', 8)] } };
    };
    const ai = fakeOpenAI([replyWithPlan, replyWithPlan]);
    const c = await client(app, asMember(m.id));

    const res = await c.post('/api/ai/workout-plans/generate', { weeks: 6 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'draft', source: 'ai', weeks: 6, days_per_week: 3, goal: 'build_muscle' });
    expect(res.body.days).toHaveLength(3);
    expect(res.body.days[0].exercises[0].exercise.name).toBeDefined();
    // a beginner is only offered beginner exercises
    const offered = schemaEnum(ai.requests[0], 'exercise_id');
    expect(await prisma.exercise.count({ where: { id: { in: offered }, difficulty: { not: 'beginner' } } })).toBe(0);
    expect((await prisma.workoutPlan.findUniqueOrThrow({ where: { id: res.body.id } })).ai_usage_id).not.toBeNull();

    const second = await c.post('/api/ai/workout-plans/generate', {});
    expect((await c.post(`/api/fitness/workout-plans/${res.body.id}/activate`)).body.status).toBe('active');
    expect((await c.post(`/api/fitness/workout-plans/${second.body.id}/activate`)).status).toBe(200);
    const statuses = await prisma.workoutPlan.findMany({ where: { member_id: m.id }, select: { id: true, status: true } });
    expect(statuses.find((p) => p.id === res.body.id)?.status).toBe('archived');
    expect(statuses.filter((p) => p.status === 'active')).toHaveLength(1);
  });

  test('the database refuses a second active plan', async () => {
    const m = await createMember();
    const plan = { member_id: m.id, title: 'p', goal: 'general_health' as const, weeks: 4, days_per_week: 3, source: 'coach' as const, status: 'active' as const, activated_at: new Date() };
    await prisma.workoutPlan.create({ data: plan });
    await expect(prisma.workoutPlan.create({ data: plan })).rejects.toThrow();
  });

  test('an empty exercise library is a 409', async () => {
    const m = await memberWithFitnessData();
    fakeOpenAI([]);
    const res = await (await client(app, asMember(m.id))).post('/api/ai/workout-plans/generate', {});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EXERCISE_LIBRARY_EMPTY');
  });
});

describe('AI meal plan', () => {
  test('missing body data is a 422 listing what is needed', async () => {
    const m = await createMember();
    const res = await (await client(app, asMember(m.id))).post('/api/ai/meal-plans/generate', {});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('NUTRITION_DATA_MISSING');
    expect(res.body.details.missing).toHaveLength(3);
  });

  test('targets are computed on the server and stored with the meals', async () => {
    const m = await memberWithFitnessData();
    const ai = fakeOpenAI([
      {
        json: {
          title: 'Thực đơn tăng cơ',
          notes: null,
          days: [
            {
              meals: [
                { meal_type: 'breakfast', name: 'Phở bò', description: null, calories: 600, protein_g: 35, carbs_g: 80, fat_g: 15 },
                { meal_type: 'lunch', name: 'Cơm ức gà', description: null, calories: 900, protein_g: 55, carbs_g: 110, fat_g: 20 },
                { meal_type: 'dinner', name: 'Cá hồi, khoai lang', description: null, calories: 800, protein_g: 45, carbs_g: 70, fat_g: 30 },
              ],
            },
          ],
        },
      },
    ]);
    const res = await (await client(app, asMember(m.id))).post('/api/ai/meal-plans/generate', { days: 1 });

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.targets.calories).toBe(res.body.target_calories);
    expect(res.body.daily_totals[0]).toMatchObject({ day_index: 1, calories: 2300 });
    // the model received the targets, not the raw body data
    expect(String(ai.requests[0].messages[1].content)).toContain(`"calories":${res.body.target_calories}`);
  });
});

describe('AI progress report', () => {
  test('needs some data', async () => {
    const m = await createMember();
    const res = await (await client(app, asMember(m.id))).post('/api/ai/progress-report');
    expect(res.status).toBe(422);
  });

  test('stats are computed in SQL and interpreted by the model', async () => {
    await seedExercises();
    const m = await memberWithFitnessData();
    const squat = await prisma.exercise.findUniqueOrThrow({ where: { name: 'Goblet Squat' } });
    await prisma.workoutLog.create({
      data: { member_id: m.id, duration_minutes: 50, perceived_effort: 7, sets: { create: [{ exercise_id: squat.id, set_number: 1, reps: 10, weight_kg: 20 }] } },
    });
    fakeOpenAI([{ json: { headline: 'Tốt lắm!', summary: 's', wins: ['w'], concerns: ['c'], recommendations: ['r'] } }]);
    const res = await (await client(app, asMember(m.id))).post('/api/ai/progress-report');
    expect(res.status).toBe(200);
    expect(res.body.stats.volume_by_muscle_30d).toEqual([{ muscle_group: 'legs', sets: 1, volume_kg: 200 }]);
    expect(res.body.stats.training_by_week[0]).toMatchObject({ workouts: 1, minutes: 50, avg_rpe: 7 });
    expect(res.body.report.headline).toBe('Tốt lắm!');
  });
});

describe('AI churn insights (staff)', () => {
  test('scores active members, stores insights and lists the latest per member', async () => {
    const pkg = await createPackage();
    const now = Date.now();
    const inactive = await createMember({ full_name: 'Nguyen Van An' });
    const regular = await createMember({ full_name: 'Tran Thi Binh' });
    const noSubscription = await createMember();
    for (const m of [inactive, regular]) {
      await prisma.subscription.create({
        data: { member_id: m.id, package_id: pkg.id, status: 'active', start_date: new Date(now - 60 * DAY), end_date: new Date(now + 5 * DAY) },
      });
    }
    await prisma.checkin.create({ data: { member_id: inactive.id, checkin_time: new Date(now - 30 * DAY) } });
    for (let i = 1; i <= 6; i++) await prisma.checkin.create({ data: { member_id: regular.id, checkin_time: new Date(now - i * 2 * DAY) } });
    await prisma.checkin.create({ data: { member_id: noSubscription.id, checkin_time: new Date(now - 90 * DAY) } });

    const ai = fakeOpenAI([
      (body) => {
        const ids = schemaEnum(body, 'member_id');
        return {
          json: {
            insights: ids.map((id) => ({
              member_id: id,
              risk_score: id === inactive.id ? 90 : 10,
              summary: 's',
              recommended_action: 'a',
              outreach_message: 'm',
            })),
          },
        };
      },
    ]);
    const c = await client(app, asStaff());
    const res = await c.post('/api/ai/insights/churn', {});

    expect(res.status).toBe(201);
    expect(res.body.analyzed).toBe(2);
    expect(schemaEnum(ai.requests[0], 'member_id')).not.toContain(noSubscription.id);
    expect(res.body.insights[0]).toMatchObject({ member_id: inactive.id, risk_level: 'high' });
    expect(res.body.insights[0].features.days_since_last_checkin).toBe(30);

    const high = await c.get('/api/ai/insights?risk_level=high');
    expect(high.body.map((i: { member_id: string }) => i.member_id)).toEqual([inactive.id]);

    const usage = await c.get('/api/ai/usage?days=7');
    expect(usage.body.total.requests).toBe(1);
    expect(usage.body.by_feature[0]).toMatchObject({ feature: 'churn_insight', prompt_tokens: 1000 });
  });

  test('members cannot run it', async () => {
    const m = await createMember();
    expect((await (await client(app, asMember(m.id))).post('/api/ai/insights/churn', {})).status).toBe(403);
  });
});

describe('fitness API', () => {
  test('profile defaults, upsert and BMI', async () => {
    const m = await createMember();
    const c = await client(app, asMember(m.id));
    expect((await c.get('/api/fitness/profile')).body).toMatchObject({ is_default: true, goal: 'general_health' });
    expect((await c.put('/api/fitness/profile', { height_cm: 175, goal: 'lose_fat' })).status).toBe(200);
    expect((await c.post('/api/fitness/metrics', { weight_kg: 70 })).status).toBe(201);
    expect((await c.get('/api/fitness/profile')).body).toMatchObject({ is_default: false, goal: 'lose_fat', bmi: 22.9 });
  });

  test('metrics are validated and private', async () => {
    const m = await createMember();
    const other = await createMember();
    const c = await client(app, asMember(m.id));
    expect((await c.post('/api/fitness/metrics', { weight_kg: 5 })).status).toBe(400);
    const metric = (await c.post('/api/fitness/metrics', { weight_kg: 80, body_fat_pct: 20 })).body;
    expect((await (await client(app, asMember(other.id))).delete(`/api/fitness/metrics/${metric.id}`)).status).toBe(404);
    expect((await c.get('/api/fitness/metrics')).body.data).toHaveLength(1);
    expect((await c.delete(`/api/fitness/metrics/${metric.id}`)).status).toBe(200);
  });

  test('exercise library: public list, staff-only writes, unique names', async () => {
    await seedExercises();
    const anon = await client(app);
    const legs = await anon.get('/api/fitness/exercises?muscle_group=legs&difficulty=beginner');
    expect(legs.status).toBe(200);
    expect(legs.body.length).toBeGreaterThan(0);
    expect(legs.body.every((e: { muscle_group: string }) => e.muscle_group === 'legs')).toBe(true);

    const staff = await client(app, asStaff());
    const body = { name: 'Hip Thrust', muscle_group: 'legs', difficulty: 'intermediate', equipment: 'barbell' };
    const created = await staff.post('/api/fitness/exercises', body);
    expect(created.status).toBe(201);
    expect((await staff.post('/api/fitness/exercises', body)).status).toBe(409);
    expect((await staff.patch(`/api/fitness/exercises/${created.body.id}`, { is_active: false })).body.is_active).toBe(false);
    expect((await anon.post('/api/fitness/exercises', body)).status).toBe(401);
  });

  test('workout logs with sets; unknown exercises and duplicate sets are rejected', async () => {
    await seedExercises();
    const m = await createMember();
    const c = await client(app, asMember(m.id));
    const pushup = await prisma.exercise.findUniqueOrThrow({ where: { name: 'Push-up' } });

    const ok = await c.post('/api/fitness/workout-logs', {
      duration_minutes: 30,
      perceived_effort: 6,
      sets: [
        { exercise_id: pushup.id, set_number: 1, reps: 15 },
        { exercise_id: pushup.id, set_number: 2, reps: 12 },
      ],
    });
    expect(ok.status).toBe(201);
    expect(ok.body.sets).toHaveLength(2);

    const dup = await c.post('/api/fitness/workout-logs', { sets: [{ exercise_id: pushup.id, set_number: 1, reps: 1 }, { exercise_id: pushup.id, set_number: 1, reps: 2 }] });
    expect(dup.status).toBe(400);
    const unknown = await c.post('/api/fitness/workout-logs', { sets: [{ exercise_id: '00000000-0000-4000-8000-000000000000', set_number: 1, reps: 1 }] });
    expect(unknown.body.code).toBe('INVALID_EXERCISE');
    expect((await c.post('/api/fitness/workout-logs', { plan_day_id: '00000000-0000-4000-8000-000000000000' })).body.code).toBe('INVALID_PLAN_DAY');

    const list = await c.get('/api/fitness/workout-logs');
    expect(list.body.data[0].sets[0].exercise.name).toBe('Push-up');
  });

  test('staff overview of a member', async () => {
    const m = await memberWithFitnessData();
    const res = await (await client(app, asStaff())).get(`/api/fitness/members/${m.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: m.id, profile: { height_cm: 175 }, active_plan: null, latest_insight: null });
    expect(res.body.body_metrics).toHaveLength(1);
  });
});
