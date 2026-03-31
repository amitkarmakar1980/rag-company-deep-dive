import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateStructuredCompletion(
  prompt: string,
  _jsonSchema?: Record<string, any>
): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a business analysis engine helping job candidates make informed decisions. 
Your responses must be grounded in provided evidence. Do not fabricate or hallucinate details.
Always respond with valid JSON that matches the requested schema.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content in response");

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON from response", content);
    throw new Error("Could not extract JSON from LLM response");
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Failed to parse JSON", jsonMatch[0], e);
    throw new Error("Invalid JSON in LLM response");
  }
}

export async function generateText(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a business analysis engine. Be concise, grounded, and honest about uncertainties.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0].message.content || "";
}
