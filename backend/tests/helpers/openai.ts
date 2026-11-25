import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import { setCompletionsApi } from '../../src/services/ai/client';

// A scripted stand-in for the OpenAI chat completions API. Each call consumes the next reply;
// every request body is recorded so tests can assert what the model was shown.

type Reply =
  | { content: string }
  | { json: unknown }
  | { toolCalls: { name: string; args: unknown }[] }
  | { error: string };

type ReplyFn = (body: ChatCompletionCreateParamsNonStreaming) => Reply;

let callSeq = 0;

function completion(message: ChatCompletion['choices'][number]['message']): ChatCompletion {
  return {
    id: `chatcmpl-${++callSeq}`,
    object: 'chat.completion',
    created: 0,
    model: 'gpt-4o-mini',
    choices: [{ index: 0, finish_reason: message.tool_calls ? 'tool_calls' : 'stop', logprobs: null, message }],
    usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 },
  };
}

export function fakeOpenAI(replies: (Reply | ReplyFn)[]) {
  const requests: ChatCompletionCreateParamsNonStreaming[] = [];
  const queue = [...replies];
  setCompletionsApi({
    async create(body) {
      requests.push(body);
      const next = queue.shift();
      if (!next) throw new Error('fakeOpenAI: no scripted reply left');
      const reply = typeof next === 'function' ? next(body) : next;
      if ('error' in reply) throw new Error(reply.error);
      if ('toolCalls' in reply) {
        const tool_calls: ChatCompletionMessageToolCall[] = reply.toolCalls.map((c, i) => ({
          id: `call_${callSeq}_${i}`,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.args) },
        }));
        return completion({ role: 'assistant', content: null, refusal: null, tool_calls });
      }
      const content = 'json' in reply ? JSON.stringify(reply.json) : reply.content;
      return completion({ role: 'assistant', content, refusal: null });
    },
  });
  return { requests, remaining: () => queue.length };
}

export function resetOpenAI() {
  setCompletionsApi(undefined);
}

// The enum of exercise ids the server put into the JSON schema of a structured request.
export function schemaEnum(body: ChatCompletionCreateParamsNonStreaming, property: string): string[] {
  const found: string[][] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === property && value && typeof value === 'object' && Array.isArray((value as { enum?: unknown }).enum)) {
        found.push((value as { enum: string[] }).enum);
      }
      walk(value);
    }
  };
  walk(body.response_format);
  return found[0] ?? [];
}
