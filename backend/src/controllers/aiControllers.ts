import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { logger } from '../lib/logger';
import { z } from '../lib/zod';
import { aiLimiter } from '../middleware/rateLimit';
import { chatWithAI } from '../services/ai.service';

export const chat = endpoint(
  {
    summary: 'Chat with the AI fitness advisor',
    auth: 'public',
    middleware: [aiLimiter],
    body: z.object({
      // Only user/assistant turns: a client must not be able to inject a system prompt.
      messages: z
        .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
        .min(1)
        .max(20),
    }),
  },
  async ({ body, res }) => {
    try {
      res.json({ message: await chatWithAI(body.messages) });
    } catch (err) {
      logger.error('AI chat failed', { type: 'AI', error: err instanceof Error ? err.message : String(err) });
      throw new AppError('Failed to get chat response at this time.', 502);
    }
  },
);
