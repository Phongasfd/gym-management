import OpenAI from 'openai';

const CHAT_SYSTEM_PROMPT = `You are a knowledgeable gym and fitness assistant chatbot for a gym management system.

Your role is to provide helpful advice and information about:
- Diet and nutrition
- Workout programs and training plans
- Gym packages and memberships
- Body composition and fitness goals
- General gym-related questions

IMPORTANT RULES:
- Be friendly, encouraging, and professional
- Provide accurate, safe fitness and nutrition advice
- Do NOT act as a medical professional or replace qualified healthcare providers
- Encourage consulting professionals for personalized medical advice
- Keep responses informative but not overwhelming
- Be conversational and engaging
- If users ask about specific medical conditions, recommend seeing a doctor
- Promote healthy, sustainable approaches to fitness

You have access to gym packages: Basic, Standard, Premium.
You can discuss general workout principles, but don't create detailed personalized programs.

Always respond helpfully and stay in character as a gym fitness assistant.`;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

let client: OpenAI | undefined;

// Created on first use so the app (and its tests) can start without an OpenAI key.
function getClient() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function chatWithAI(messages: ChatMessage[]): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7, // 0 = deterministic, 1 = more creative
    max_tokens: 500,
    // Only user/assistant turns come from the client; the system prompt is always ours.
    messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages],
  });
  return response.choices[0]?.message?.content ?? '';
}
