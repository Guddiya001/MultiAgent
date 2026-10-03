import ollama from "ollama";

import { createPlan } from "./planner.js";
import { mathAgent } from "./mathAgent.js";
import { weatherAgent } from "./weatherAgent.js";
import { researchAgent } from "./researchAgent.js";

const agents = {
  math_agent: mathAgent,
  weather_agent: weatherAgent,
  research_agent: researchAgent
};

export async function supervisor(userMessage) {

  // --------------------------------
  // 1. PLAN
  // --------------------------------

  const plan = await createPlan(userMessage);

  console.log("\nTask Plan:");
  console.dir(plan, { depth: null });

  if (!plan.tasks || !Array.isArray(plan.tasks)) {
    throw new Error("Invalid task plan");
  }

  // --------------------------------
  // 2. EXECUTE IN PARALLEL
  // --------------------------------

  console.log(
    `\nExecuting ${plan.tasks.length} task(s) in parallel...\n`
  );

  const tasks = plan.tasks.map(async (task) => {

    const agent = agents[task.agent];

    if (!agent) {
      throw new Error(
        `Unknown agent: ${task.agent}`
      );
    }

    console.log(
      `Starting: ${task.agent}`
    );

    try {

      const result = await agent(task.question);

      console.log(
        `Finished: ${task.agent}`
      );

      return {
        agent: task.agent,
        question: task.question,
        result,
        success: true
      };

    } catch (error) {

      console.error(
        `Failed: ${task.agent}`,
        error.message
      );

      return {
        agent: task.agent,
        question: task.question,
        result: null,
        success: false,
        error: error.message
      };
    }
  });

  const results = await Promise.all(tasks);

  // --------------------------------
  // 3. COMBINE RESULTS
  // --------------------------------

  console.log("\nAgent Results:");
  console.dir(results, { depth: null });

  const finalPrompt = `
The user asked:

${userMessage}

The specialized agents produced these results:

${JSON.stringify(results, null, 2)}

Create one clear final answer.

Rules:

- Include every successful result.
- If an agent failed, clearly mention that part could not be completed.
- Do not invent missing information.
- Do not perform new research.
`;

  // --------------------------------
  // 4. FINAL LLM
  // --------------------------------

  const finalResponse = await ollama.chat({
    model: "gpt-oss:120b-cloud",

    messages: [
      {
        role: "system",
        content:
          "You are the final response generator."
      },

      {
        role: "user",
        content: finalPrompt
      }
    ]
  });

  console.log("\nFinal Ollama Response:");
  console.dir(finalResponse.message, { depth: null });

  return finalResponse.message.content;
}