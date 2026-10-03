import ollama from "ollama";

export async function createPlan(userMessage) {
  const response = await ollama.chat({
    model: "gpt-oss:120b-cloud",

    messages: [
      {
        role: "system",
        content: `
You are a task planner.

Break the user's request into independent tasks.

Available agents:

- math_agent
- weather_agent
- research_agent

Return ONLY valid JSON.

Format:

{
  "tasks": [
    {
      "agent": "math_agent",
      "question": "..."
    }
  ]
}

Rules:

1. Create one task for every independent request.
2. Do not solve the tasks.
3. Do not omit any part of the user's request.
4. Use only the available agent names.
`
      },

      {
        role: "user",
        content: userMessage
      }
    ]
  });

  console.log("\nPlanner response:");
  console.dir(response.message, { depth: null });

  let content = response.message.content;

  // Remove markdown JSON fences if model adds them
  content = content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(content);
}