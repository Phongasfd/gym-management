const { OpenAI } = require('openai');

// initialize once using env variable
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function getAdvice(userData) {
  // put all instructions clearly in the system prompt
  const systemPrompt = `You are a helpful gym‑advice assistant. You receive user demographics and fitness goals, and you:
- calculate the user's total daily energy expenditure (TDEE)
- recommend a sensible daily calorie target based on the goal
- suggest an appropriate gym membership package (e.g. Basic, Standard, Premium) based on the user's stated goal and activity level
- offer only general, high‑level advice

IMPORTANT:
• Do NOT generate a detailed workout program or meal plan.
• Do NOT act as or replace a personal trainer or medical professional.
• Keep answers brief and factual. The output MUST be valid JSON with the following top‑level keys:
  {
    "tdee": <number>,
    "recommended_calories": <number>,
    "package": <string>,
    "advice": <string>
  }

Return exactly one JSON object and nothing else.`;

  const userPrompt = `User data: ${JSON.stringify(userData)}.`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      // the new Responses API uses an array of messages
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    // The SDK may return the structured object directly under output[0].content.
    const output = response.output?.[0]?.content;
    let result;

    if (output && Array.isArray(output)) {
      // array of things, look for json_object
      const jsonBlock = output.find((x) => x.type === 'json_object');
      if (jsonBlock && jsonBlock.data) {
        result = jsonBlock.data;
      } else {
        // fallback: maybe the model returned text we can parse
        const textItem = output.find((x) => x.type === 'output_text');
        if (textItem) {
          result = JSON.parse(textItem.text);
        }
      }
    } else if (output && output.type === 'json_object') {
      result = output.data;
    }

    if (!result) {
      throw new Error('Unable to interpret OpenAI response structure');
    }

    return result;
  } catch (err) {
    // bubble up error for caller to handle
    throw err;
  }
}

module.exports = { getAdvice };
