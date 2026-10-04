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

  console.log("\n==============================");
  console.log("LEVEL 8 SUPERVISOR");
  console.log("==============================");


  // =================================
  // STEP 1
  // Create execution plan
  // =================================

  console.log("\n1. Creating execution plan...");

  const plan = await createPlan(userMessage);

  console.log("\nExecution Plan:");

  console.dir(plan, { depth: null });


  // =================================
  // STEP 2
  // Validate plan
  // =================================

  if (
    !plan.tasks ||
    !Array.isArray(plan.tasks)
  ) {
    throw new Error(
      "Planner returned an invalid task list"
    );
  }


  // =================================
  // STEP 3
  // Store task results
  // =================================

  const results = [];

  const completedTasks = new Set();


  // =================================
  // STEP 4
  // Execute dependency-aware tasks
  // =================================

  console.log("\n2. Executing tasks...");


  while (
    completedTasks.size < plan.tasks.length
  ) {

    let progress = false;


    for (const task of plan.tasks) {

      // Already completed
      if (completedTasks.has(task.id)) {
        continue;
      }


      // ---------------------------------
      // Check dependencies
      // ---------------------------------

      const dependencies =
        task.dependsOn || [];


      const dependenciesCompleted =
        dependencies.every(
          (dependencyId) =>
            completedTasks.has(dependencyId)
        );


      // Dependencies not ready
      if (!dependenciesCompleted) {

        console.log(
          `Task ${task.id} waiting for:`,
          dependencies.filter(
            (id) =>
              !completedTasks.has(id)
          )
        );

        continue;
      }


      // ---------------------------------
      // Find agent
      // ---------------------------------

      const agent =
        agents[task.agent];


      if (!agent) {

        results.push({

          taskId: task.id,

          agent: task.agent,

          question: task.question,

          success: false,

          error:
            `Unknown agent: ${task.agent}`

        });


        completedTasks.add(task.id);

        progress = true;

        continue;
      }


      // ---------------------------------
      // Prepare dependency results
      // ---------------------------------

      const dependencyResults =
        results.filter(
          (result) =>
            dependencies.includes(
              result.taskId
            )
        );


      // ---------------------------------
      // Build agent input
      // ---------------------------------

      const agentInput = `

Original user request:

${userMessage}


Your task:

${task.question}


Results from previous tasks:

${JSON.stringify(
  dependencyResults,
  null,
  2
)}

Use the previous task results
when required.

Do not invent missing information.

`;


      // ---------------------------------
      // Execute agent
      // ---------------------------------

      console.log(
        `\nStarting Task ${task.id}: ${task.agent}`
      );


      try {

        const result =
          await agent(agentInput);


        console.log(
          `Finished Task ${task.id}`
        );


        results.push({

          taskId: task.id,

          agent: task.agent,

          question: task.question,

          result,

          success: true

        });


      } catch (error) {

        console.error(
          `Task ${task.id} failed:`,
          error.message
        );


        results.push({

          taskId: task.id,

          agent: task.agent,

          question: task.question,

          result: null,

          success: false,

          error: error.message

        });

      }


      completedTasks.add(task.id);

      progress = true;

    }


    // =================================
    // Safety check
    // =================================

    if (!progress) {

      throw new Error(
        "Workflow cannot continue. There may be a circular or unresolved dependency."
      );

    }

  }


  // =================================
  // STEP 5
  // Final Agent
  // =================================

  console.log(
    "\n3. Generating final response..."
  );


  const finalResponse =
    await ollama.chat({

      model: "gpt-oss:120b-cloud",

      messages: [

        {
          role: "system",

          content: `
You are the final response agent.

Combine the results from the
specialized agents into one clear answer.

Rules:

1. Answer the original user request.
2. Include successful results.
3. Clearly mention failed tasks.
4. Do not invent information.
5. Do not perform new research.
6. Use dependency results when relevant.
`
        },

        {
          role: "user",

          content: `

Original user request:

${userMessage}


Execution plan:

${JSON.stringify(
  plan,
  null,
  2
)}


Agent results:

${JSON.stringify(
  results,
  null,
  2
)}

`
        }

      ]

    });


  return finalResponse.message.content;
}