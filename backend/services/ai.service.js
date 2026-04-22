const { OpenAI } = require('openai');

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompt for conversational chat
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

/**
 * Handle conversational chat with the AI assistant
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<string>} AI response text
 */
async function chatWithAI(messages) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      // Điều chỉnh độ “sáng tạo” của AI
      // 0 → rất logic, ít sáng tạo
      // 1 → sáng tạo hơn
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...messages
      ],
      // system → luật chơi / tính cách AI
      // user → câu hỏi người dùng
      // assistant → câu trả lời trước đó của AI
      max_tokens: 500
      // Giới hạn độ dài output
      // càng lớn → trả lời càng dài
      // 500 = vừa đủ cho đa số câu trả lời
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error in chatWithAI:', error);
    throw new Error('Failed to get AI response');
  }
}

module.exports = { chatWithAI };
