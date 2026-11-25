import type { Prisma } from '@prisma/client';
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';
import { env } from '../../config/env';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { assertQuota, complete } from './client';
import { executeTool, toolDefinitions } from './tools';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface ChatAction {
  tool: string;
  arguments: unknown;
  result: unknown;
}

export interface ChatResult {
  message: string;
  conversationId: string | null;
  actions: ChatAction[];
}

// Messages of a stored conversation sent back to the model on each turn.
const HISTORY_LIMIT = 30;

function systemPrompt(now: Date, signedIn: boolean) {
  return `You are the virtual coach and front-desk assistant of a gym. Today is ${now.toISOString().slice(0, 10)} (UTC).

You help with: membership packages, class schedules and bookings, workout technique and programming principles,
nutrition basics, and the member's own progress.

Rules:
- Facts about the gym (prices, packages, classes, seats, the member's membership, bookings, progress) MUST come from
  the tools. Never invent them. If a tool returns nothing, say so.
- Before booking or cancelling, call the tool with confirmed=false, tell the member exactly what will happen, and only
  call it with confirmed=true after they clearly say yes in their latest message.
- ${signedIn ? 'The user is a signed-in member; personal tools are available.' : 'The user is not signed in. For bookings or personal data, ask them to sign in.'}
- You are not a doctor. For pain, injuries, medical conditions or medication, recommend a professional.
- Answer in the user's language (Vietnamese if they write Vietnamese). Be concise, friendly and practical.
- Prices are in VND; format them like 500.000đ.`;
}

// Converts stored rows back into the OpenAI message format. A window that starts in the middle of
// a tool exchange would be rejected by the API, so leading non-user messages are dropped.
export function toModelMessages(
  rows: { role: 'user' | 'assistant' | 'tool'; content: string; tool_calls: Prisma.JsonValue | null; tool_call_id: string | null }[],
): ChatCompletionMessageParam[] {
  const firstUser = rows.findIndex((r) => r.role === 'user');
  if (firstUser === -1) return [];
  return rows.slice(firstUser).map((r): ChatCompletionMessageParam => {
    if (r.role === 'tool') return { role: 'tool', tool_call_id: r.tool_call_id ?? '', content: r.content };
    if (r.role === 'assistant' && Array.isArray(r.tool_calls) && r.tool_calls.length > 0) {
      return { role: 'assistant', content: r.content || null, tool_calls: r.tool_calls as unknown as ChatCompletionMessageToolCall[] };
    }
    return { role: r.role, content: r.content };
  });
}

type NewTurn =
  | { role: 'assistant'; content: string; tool_calls?: ChatCompletionMessageToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string; tool_name: string };

export async function chat(input: { memberId?: string; conversationId?: string; messages: ChatMessage[]; now?: Date }): Promise<ChatResult> {
  const now = input.now ?? new Date();
  const { memberId } = input;
  const last = input.messages[input.messages.length - 1];
  if (!last || last.role !== 'user') {
    throw new AppError('The last message must come from the user', 400, { code: 'VALIDATION_ERROR' });
  }
  await assertQuota({ memberId }, now);

  // ---- history ----
  let conversationId: string | null = null;
  let history: ChatCompletionMessageParam[];
  if (memberId) {
    if (input.conversationId) {
      const conv = await prisma.aiConversation.findFirst({ where: { id: input.conversationId, member_id: memberId } });
      if (!conv) throw new AppError('Conversation not found', 404);
      conversationId = conv.id;
      const rows = await prisma.aiMessage.findMany({
        where: { conversation_id: conv.id },
        orderBy: { created_at: 'desc' },
        take: HISTORY_LIMIT,
      });
      history = toModelMessages(rows.reverse());
    } else {
      const conv = await prisma.aiConversation.create({ data: { member_id: memberId, title: last.content.slice(0, 80) } });
      conversationId = conv.id;
      history = input.messages.slice(0, -1);
    }
    await prisma.aiMessage.create({ data: { conversation_id: conversationId, role: 'user', content: last.content, created_at: now } });
  } else {
    history = input.messages.slice(0, -1);
  }

  // ---- tool-calling loop ----
  const tools = toolDefinitions({ memberId });
  const newTurns: NewTurn[] = []; // what gets stored
  const modelTurns: ChatCompletionMessageParam[] = []; // the same turns, in the API format
  const actions: ChatAction[] = [];
  let answer = '';

  for (let round = 0; ; round++) {
    const lastRound = round >= env.ai.maxToolRounds;
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt(now, Boolean(memberId)) },
      ...history,
      { role: 'user', content: last.content },
      ...modelTurns,
    ];

    const { completion } = await complete({
      feature: 'chat',
      actor: { memberId },
      request: { messages, tools, tool_choice: lastRound ? 'none' : 'auto', temperature: 0.4, max_tokens: 700 },
    });
    const msg = completion.choices[0]?.message;
    const toolCalls = (msg?.tool_calls ?? []).filter((c) => c.type === 'function');

    if (toolCalls.length === 0 || lastRound) {
      answer = msg?.content?.trim() || 'Xin lỗi, mình chưa trả lời được câu này. Bạn thử hỏi lại nhé!';
      newTurns.push({ role: 'assistant', content: answer });
      break;
    }

    newTurns.push({ role: 'assistant', content: msg?.content ?? '', tool_calls: toolCalls });
    modelTurns.push({ role: 'assistant', content: msg?.content ?? null, tool_calls: toolCalls } satisfies ChatCompletionAssistantMessageParam);
    for (const call of toolCalls) {
      const result = await executeTool(call.function.name, call.function.arguments, { memberId, now });
      let args: unknown = call.function.arguments;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        // keep the raw string
      }
      actions.push({ tool: call.function.name, arguments: args, result });
      newTurns.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: call.id, tool_name: call.function.name });
      modelTurns.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: call.id });
    }
  }

  // ---- persist ----
  if (conversationId) {
    // Explicit, strictly increasing timestamps keep the turns in order when read back.
    const base = now.getTime();
    await prisma.$transaction([
      prisma.aiMessage.createMany({
        data: newTurns.map((t, i) => ({
          conversation_id: conversationId as string,
          role: t.role,
          content: t.content,
          tool_calls: t.role === 'assistant' && t.tool_calls ? (t.tool_calls as unknown as Prisma.InputJsonValue) : undefined,
          tool_call_id: t.role === 'tool' ? t.tool_call_id : undefined,
          tool_name: t.role === 'tool' ? t.tool_name : undefined,
          created_at: new Date(base + i + 1),
        })),
      }),
      prisma.aiConversation.update({ where: { id: conversationId }, data: { updated_at: new Date() } }),
    ]);
  }

  return { message: answer, conversationId, actions };
}
