const { OpenAI } = require('openai');

// initialize once using env variable
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function getAdvice(userData) {
  // put all instructions clearly in the system prompt
  const systemPrompt = `
      You are a knowledgeable gym and fitness assistant.

      You receive user demographics (age, gender, height, weight), activity level, and fitness goals.

      Your responsibilities:

      1. Estimate the user's Total Daily Energy Expenditure (TDEE).
      2. Recommend a sensible daily calorie target based on the goal (fat loss, maintenance, muscle gain).
      3. Suggest an appropriate gym membership package (Basic, Standard, Premium).
      4. Provide helpful, practical fitness guidance.

      IMPORTANT RULES:

      • Do NOT generate a detailed workout program.
      • Do NOT generate a full meal plan.
      • Do NOT act as a medical professional or replace a personal trainer.
      • Only provide general, safe guidance.

      RESPONSE STYLE:

      The explanation should be informative and moderately detailed.

      For each field:

      tdee  
      - Provide the estimated TDEE value in kcal.
      - Briefly explain that it represents daily energy expenditure based on body metrics and activity level.

      recommended_calories  
      - Provide a calorie target number.
      - Briefly explain why this level supports the user's goal (calorie deficit for fat loss, surplus for muscle gain, or maintenance).

      package  
      - Suggest one of: "Basic", "Standard", "Premium".
      - Briefly explain why this package may suit the user's commitment level or training needs.

      advice  
      - Provide 4–6 sentences of general fitness guidance.
      - Mention training consistency, recovery, nutrition habits, and realistic expectations.

      OUTPUT FORMAT:

      Return EXACTLY one valid JSON object with the following structure:

      {
        "tdee": {
          "value": number,
          "explanation": string
        },
        "recommended_calories": {
          "value": number,
          "explanation": string
        },
        "package": {
          "name": string,
          "reason": string
        },
        "advice": string
      }

      Return ONLY the JSON object and nothing else.
`;

  const userPrompt = `User data: ${JSON.stringify(userData)}.`;

  const response = await client.responses.create({
      model: 'gpt-4.1-nano',
      temperature: 0.3,
      // the new Responses API uses an array of messages
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      text: {
        format: {
          type: "json_object"
        }
      }
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
}

module.exports = { getAdvice };
