import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { AiFeature } from '@prisma/client';
import type { ZodTypeAny, z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../lib/AppError';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

// Every OpenAI request in the app goes through this module, so that each one is:
//   - quota-checked (per member, per UTC day),
//   - measured (tokens, estimated cost, latency) and written to AiUsageLog,
//   - turned into a clean AppError when the upstream call fails.

export type AiActor = { memberId?: string; staffId?: string };

// The only part of the SDK the app uses. Tests swap in a fake with setCompletionsApi().
export type CompletionsApi = {
  create(body: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion>;
};

let api: CompletionsApi | undefined;

export function setCompletionsApi(fake: CompletionsApi | undefined) {
  api = fake;
}

function getApi(): CompletionsApi {
  if (api) return api;
  if (!env.ai.apiKey) {
    throw new AppError('AI features are not configured on this server', 503, { code: 'AI_NOT_CONFIGURED' });
  }
  const client = new OpenAI({ apiKey: env.ai.apiKey, timeout: env.ai.timeoutMs, maxRetries: 2 });
  api = { create: (body) => client.chat.completions.create(body) };
  return api;
}

// USD per 1M tokens [input, output]. Longest matching prefix wins; unknown models cost 0.
const PRICING: Record<string, [number, number]> = {
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4o': [2.5, 10],
  'gpt-4.1-nano': [0.1, 0.4],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-4.1': [2, 8],
  'gpt-5-nano': [0.05, 0.4],
  'gpt-5-mini': [0.25, 2],
  'gpt-5': [1.25, 10],
};

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const key = Object.keys(PRICING)
    .filter((prefix) => model.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  if (!key) return 0;
  const [input, output] = PRICING[key];
  return Number(((promptTokens * input + completionTokens * output) / 1_000_000).toFixed(6));
}

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Members get a daily budget of OpenAI requests (all features together). Staff are not limited.
export async function assertQuota(actor: AiActor, now = new Date()) {
  const limit = env.ai.memberDailyLimit;
  if (!actor.memberId || limit <= 0) return;
  const used = await prisma.aiUsageLog.count({
    where: { member_id: actor.memberId, created_at: { gte: startOfUtcDay(now) } },
  });
  if (used >= limit) {
    throw new AppError('Daily AI quota reached, please try again tomorrow', 429, {
      code: 'AI_QUOTA_EXCEEDED',
      details: { limit, used },
    });
  }
}

type Request = Omit<ChatCompletionCreateParamsNonStreaming, 'model'> & { model?: string };

export async function complete(input: {
  feature: AiFeature;
  actor: AiActor;
  request: Request;
}): Promise<{ completion: ChatCompletion; usageId: string }> {
  const { feature, actor, request } = input;
  const model = request.model ?? env.ai.model;
  const started = Date.now();
  try {
    const completion = await getApi().create({ ...request, model });
    const promptTokens = completion.usage?.prompt_tokens ?? 0;
    const completionTokens = completion.usage?.completion_tokens ?? 0;
    const usage = await prisma.aiUsageLog.create({
      data: {
        feature,
        model,
        member_id: actor.memberId,
        staff_id: actor.staffId,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: estimateCostUsd(model, promptTokens, completionTokens),
        latency_ms: Date.now() - started,
        status: 'success',
      },
    });
    return { completion, usageId: usage.id };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    logger.error('OpenAI request failed', { type: 'AI', feature, error: message });
    await prisma.aiUsageLog
      .create({
        data: {
          feature,
          model,
          member_id: actor.memberId,
          staff_id: actor.staffId,
          latency_ms: Date.now() - started,
          status: 'error',
          error: message.slice(0, 500),
        },
      })
      .catch(() => undefined);
    throw new AppError('The AI service is unavailable right now, please try again later', 502, { code: 'AI_UPSTREAM_ERROR' });
  }
}

// Structured Outputs: the model must answer with JSON matching `schema` (strict JSON Schema),
// and the answer is validated again with zod before anyone uses it.
export async function completeStructured<S extends ZodTypeAny>(input: {
  feature: AiFeature;
  actor: AiActor;
  schema: S;
  name: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ data: z.output<S>; usageId: string }> {
  const { completion, usageId } = await complete({
    feature: input.feature,
    actor: input.actor,
    request: {
      messages: input.messages,
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 4000,
      response_format: zodResponseFormat(input.schema, input.name),
    },
  });
  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new AppError('The AI declined this request', 422, { code: 'AI_REFUSED', details: { reason: message.refusal } });
  }
  let json: unknown;
  try {
    json = JSON.parse(message?.content ?? '');
  } catch {
    throw new AppError('The AI returned an unreadable answer', 502, { code: 'AI_BAD_OUTPUT' });
  }
  const parsed = input.schema.safeParse(json);
  if (!parsed.success) {
    logger.warn('AI output failed validation', { type: 'AI', feature: input.feature, issues: parsed.error.issues.slice(0, 5) });
    throw new AppError('The AI returned an invalid answer', 502, { code: 'AI_BAD_OUTPUT' });
  }
  return { data: parsed.data, usageId };
}
