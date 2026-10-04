import ollama from "ollama";

export async function createPlan(userMessage) {
  const response = await ollama.chat({
    model: "gpt-oss:120b-cloud",

    messages: [
      {
        role: "system",
        content: `
You are a task planning agent.

Your job is to analyze the user's request
and create an execution plan.

Available agents:

1. math_agent
   - Mathematical calculations
   - Percentages
   - Arithmetic
   - Numeric calculations

2. weather_agent
   - Current weather
   - Temperature
   - Humidity
   - Weather conditions

3. research_agent
   - General research
   - Information lookup
   - Facts
   - Currency exchange rates

Return ONLY valid JSON.

Format:

{
  "tasks": [
    {
      "id": 1,
      "agent": "research_agent",
      "question": "Find the current USD to INR exchange rate",
      "dependsOn": []
    },
    {
      "id": 2,
      "agent": "math_agent",
      "question": "Calculate using the result from task 1",
      "dependsOn": [1]
    }
  ]
}

Rules:

1. Create one task for every requirement.
2. Use only the available agents.
3. Do not solve the task.
4. Do not provide answers.
5. Each task must have a unique numeric id.
6. Use dependsOn to represent task dependencies.
7. Use [] when a task has no dependencies.
8. A task can depend only on tasks that already exist.
9. If one task needs the result of another task, add that task's id to dependsOn.
`
      },

      {
        role: "user",
        content: userMessage
      }
    ]
  });


  let content =
    response.message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();


  try {

    return JSON.parse(content);

  } catch (error) {

    throw new Error(
      `Planner returned invalid JSON: ${content}`
    );

  }
}