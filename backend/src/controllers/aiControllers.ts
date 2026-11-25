import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { utc } from '../lib/sql';
import { z } from '../lib/zod';
import { optionalAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { idParams } from '../schemas/common';
import { chat as runChat } from '../services/ai/chat.service';
import { runChurnAnalysis } from '../services/ai/churn.service';
import { generateMealPlan } from '../services/ai/mealPlan.service';
import { generateProgressReport } from '../services/ai/progress.service';
import { generateWorkoutPlan } from '../services/ai/workoutPlan.service';

// ---------------------------------------------------------------- chat

export const chat = endpoint(
  {
    summary: 'Chat with the AI coach (tool calling over live gym data)',
    description:
      'Public. Anonymous users get a stateless chat that can look up packages and classes. Signed-in members also get ' +
      'personal tools (membership, bookings, progress, book/cancel with confirmation) and a stored conversation: send ' +
      '`conversation_id` from the previous answer to continue it. `actions` lists the tools the model called.',
    auth: 'public',
    middleware: [optionalAuth, aiLimiter],
    body: z.object({
      // Only user/assistant turns: a client must not be able to inject a system prompt.
      messages: z
        .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
        .min(1)
        .max(20),
      conversation_id: z.string().uuid().optional(),
    }),
    responses: { 200: '{ message, conversation_id, actions }', 429: 'AI_QUOTA_EXCEEDED or rate limited', 502: 'AI_UPSTREAM_ERROR' },
  },
  async ({ body, auth, res }) => {
    const memberId = auth?.userType === 'member' ? auth.userId : undefined;
    const result = await runChat({ memberId, conversationId: body.conversation_id, messages: body.messages });
    res.json({ message: result.message, conversation_id: result.conversationId, actions: result.actions });
  },
);

export const listConversations = endpoint(
  { summary: "The current member's AI conversations, most recent first", auth: 'member', query: pageQuery },
  async ({ auth, query, res }) => {
    const rows = await prisma.aiConversation.findMany({
      where: { member_id: auth.userId },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      include: { _count: { select: { messages: true } } },
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const getConversation = endpoint(
  { summary: 'One AI conversation with its user/assistant messages', auth: 'member', params: idParams },
  async ({ auth, params, res }) => {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: params.id, member_id: auth.userId },
      include: {
        // tool plumbing is internal; the UI only needs what was said
        messages: { where: { role: { in: ['user', 'assistant'] }, NOT: { content: '' } }, orderBy: { created_at: 'asc' } },
      },
    });
    if (!conv) throw new AppError('Conversation not found', 404);
    res.json({
      ...conv,
      messages: conv.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })),
    });
  },
);

export const deleteConversation = endpoint(
  { summary: 'Delete one of my AI conversations', auth: 'member', params: idParams },
  async ({ auth, params, res }) => {
    const { count } = await prisma.aiConversation.deleteMany({ where: { id: params.id, member_id: auth.userId } });
    if (count === 0) throw new AppError('Conversation not found', 404);
    res.json({ message: 'Conversation deleted' });
  },
);

// ---------------------------------------------------------------- generators (members)

export const generateWorkout = endpoint(
  {
    summary: 'Generate a personalised workout plan (Structured Outputs)',
    description:
      'Uses the fitness profile, the latest body metric and the exercise library. The model can only pick exercises ' +
      'from the library (enum in the JSON schema). Saved as a draft; activate it with POST /api/fitness/workout-plans/{id}/activate.',
    auth: 'member',
    middleware: [aiLimiter],
    body: z.object({
      weeks: z.number().int().min(1).max(12).default(4),
      request: z.string().trim().max(500).optional().openapi({ example: 'Tập trung tăng cơ mông, không có ngày tập chân liên tiếp' }),
    }),
    responses: { 201: 'Draft plan with days and exercises', 409: 'EXERCISE_LIBRARY_EMPTY', 429: 'AI_QUOTA_EXCEEDED', 502: 'AI_BAD_OUTPUT / AI_UPSTREAM_ERROR' },
  },
  async ({ auth, body, res }) => {
    res.status(201).json(await generateWorkoutPlan({ memberId: auth.userId, weeks: body.weeks, request: body.request }));
  },
);

export const generateMeals = endpoint(
  {
    summary: 'Generate a meal plan within computed calorie/macro targets',
    description:
      'Targets come from Mifflin-St Jeor BMR x activity factor, adjusted for the goal, computed on the server. The model ' +
      'only distributes Vietnamese foods within them; the response reports each day\'s deviation from the target.',
    auth: 'member',
    middleware: [aiLimiter],
    body: z.object({
      days: z.number().int().min(1).max(7).default(3),
      preferences: z.string().trim().max(500).optional().openapi({ example: 'Thích cá, không ăn cay, nấu nhanh dưới 20 phút' }),
    }),
    responses: { 201: 'Meal plan with items, targets and daily totals', 422: 'NUTRITION_DATA_MISSING', 429: 'AI_QUOTA_EXCEEDED' },
  },
  async ({ auth, body, res }) => {
    res.status(201).json(await generateMealPlan({ memberId: auth.userId, days: body.days, preferences: body.preferences }));
  },
);

export const progressReport = endpoint(
  {
    summary: 'AI review of my training, visits and body metrics',
    description: 'Statistics are computed in SQL (weekly volume, muscle balance, adherence to the active plan); the model interprets them.',
    auth: 'member',
    middleware: [aiLimiter],
    responses: { 200: '{ stats, report }', 422: 'NOT_ENOUGH_DATA' },
  },
  async ({ auth, res }) => {
    res.json(await generateProgressReport({ memberId: auth.userId }));
  },
);

// ---------------------------------------------------------------- staff

export const analyzeChurn = endpoint(
  {
    summary: 'Score churn risk of active members and draft outreach messages (staff)',
    description:
      'Behavioural features are computed in SQL, a deterministic baseline score is calculated, and the model returns a ' +
      'score, explanation, recommended action and a message for each member. Results are stored as MemberInsight rows.',
    auth: 'staff',
    middleware: [aiLimiter],
    body: z.object({
      limit: z.number().int().min(1).max(50).default(20),
      member_ids: z.array(z.string().uuid()).max(50).optional(),
    }),
    responses: { 201: '{ analyzed, insights }' },
  },
  async ({ auth, body, res }) => {
    res.status(201).json(await runChurnAnalysis({ staffId: auth.staffId, limit: body.limit, memberIds: body.member_ids }));
  },
);

export const listInsights = endpoint(
  {
    summary: 'Latest churn insight per member, riskiest first (staff)',
    auth: 'staff',
    query: z.object({
      risk_level: z.enum(['low', 'medium', 'high']).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  async ({ query, res }) => {
    const levelFilter = query.risk_level ? Prisma.sql`WHERE "risk_level" = ${query.risk_level}::"ChurnRisk"` : Prisma.empty;
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM (
        SELECT DISTINCT ON ("member_id") "id", "risk_level", "risk_score"
        FROM "MemberInsight"
        ORDER BY "member_id", "created_at" DESC
      ) latest
      ${levelFilter}
      ORDER BY "risk_score" DESC
      LIMIT ${query.limit}`;
    const insights = await prisma.memberInsight.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { member: { select: { id: true, full_name: true, email: true, phone: true } } },
      orderBy: { risk_score: 'desc' },
    });
    res.json(insights);
  },
);

export const usage = endpoint(
  {
    summary: 'OpenAI usage and estimated cost (staff)',
    auth: 'staff',
    query: z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }),
  },
  async ({ query, res }) => {
    const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);
    const [byFeature, byDay, topMembers] = await Promise.all([
      prisma.$queryRaw<{ feature: string; requests: number; errors: number; prompt_tokens: number; completion_tokens: number; cost_usd: number; avg_latency_ms: number }[]>`
        SELECT "feature"::text AS "feature",
               COUNT(*)::int AS "requests",
               COUNT(*) FILTER (WHERE "status" = 'error')::int AS "errors",
               COALESCE(SUM("prompt_tokens"), 0)::int AS "prompt_tokens",
               COALESCE(SUM("completion_tokens"), 0)::int AS "completion_tokens",
               COALESCE(SUM("cost_usd"), 0)::float AS "cost_usd",
               COALESCE(AVG("latency_ms"), 0)::int AS "avg_latency_ms"
        FROM "AiUsageLog" WHERE "created_at" >= ${utc(since)}
        GROUP BY 1 ORDER BY 6 DESC`,
      prisma.$queryRaw<{ day: Date; requests: number; cost_usd: number }[]>`
        SELECT date_trunc('day', "created_at") AS "day", COUNT(*)::int AS "requests", COALESCE(SUM("cost_usd"), 0)::float AS "cost_usd"
        FROM "AiUsageLog" WHERE "created_at" >= ${utc(since)}
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ member_id: string; full_name: string; requests: number; cost_usd: number }[]>`
        SELECT u."member_id", m."full_name", COUNT(*)::int AS "requests", COALESCE(SUM(u."cost_usd"), 0)::float AS "cost_usd"
        FROM "AiUsageLog" u JOIN "Member" m ON m."id" = u."member_id"
        WHERE u."created_at" >= ${utc(since)}
        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10`,
    ]);
    const total = byFeature.reduce(
      (acc, f) => ({ requests: acc.requests + f.requests, cost_usd: Number((acc.cost_usd + f.cost_usd).toFixed(6)) }),
      { requests: 0, cost_usd: 0 },
    );
    res.json({
      days: query.days,
      total,
      by_feature: byFeature,
      by_day: byDay.map((d) => ({ day: d.day.toISOString().slice(0, 10), requests: d.requests, cost_usd: d.cost_usd })),
      top_members: topMembers,
    });
  },
);
