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
  console.log("LEVEL 8.4 PARALLEL DAG");
  console.log("==============================");


  // =====================================
  // 1. CREATE PLAN
  // =====================================

  console.log("\n1. Creating execution plan...");

  const plan = await createPlan(userMessage);

  console.log("\nExecution Plan:");

  console.dir(plan, { depth: null });


  if (
    !plan.tasks ||
    !Array.isArray(plan.tasks)
  ) {
    throw new Error(
      "Planner returned an invalid task list"
    );
  }


  // =====================================
  // 2. WORKFLOW STATE
  // =====================================

  const completedTasks = new Set();

  const results = [];


  // =====================================
  // 3. DAG EXECUTION
  // =====================================

  console.log("\n2. Starting DAG execution...");


  while (
    completedTasks.size < plan.tasks.length
  ) {

    // -------------------------------------
    // Find tasks ready to execute
    // -------------------------------------

    const readyTasks = plan.tasks.filter(
      (task) => {

        // Already completed
        if (completedTasks.has(task.id)) {
          return false;
        }


        // Dependencies
        const dependencies =
          task.dependsOn || [];


        // Check whether every dependency
        // has completed
        return dependencies.every(
          (dependencyId) =>
            completedTasks.has(dependencyId)
        );

      }
    );


    // -------------------------------------
    // Safety check
    // -------------------------------------

    if (readyTasks.length === 0) {

      throw new Error(
        "No executable tasks found. " +
        "Possible circular or unresolved dependency."
      );

    }


    console.log(
      `\nReady tasks: ${readyTasks
        .map((task) => task.id)
        .join(", ")}`
    );


    // =====================================
    // 4. EXECUTE READY TASKS IN PARALLEL
    // =====================================

    const roundResults =
      await Promise.all(

        readyTasks.map(
          async (task) => {

            console.log(
              `Starting Task ${task.id}: ${task.agent}`
            );


            const agent =
              agents[task.agent];


            if (!agent) {

              return {

                taskId: task.id,

                agent: task.agent,

                success: false,

                error:
                  `Unknown agent: ${task.agent}`

              };

            }


            // ---------------------------------
            // Get dependency results
            // ---------------------------------

            const dependencyResults =
              results.filter(
                (result) =>
                  (task.dependsOn || [])
                    .includes(result.taskId)
              );


            // ---------------------------------
            // Build agent input
            // ---------------------------------

            const agentInput = `

                  Original user request:

                  ${userMessage}


                  Your task:

                  ${task.question}


                  Results from dependent tasks:

                  ${JSON.stringify(
              dependencyResults,
              null,
              2
            )}


                  Use the dependent task results
                  when required.

                  Do not invent missing information.

                  `;


            try {

              const result =
                await agent(agentInput);


              console.log(
                `Finished Task ${task.id}: ${task.agent}`
              );


              return {

                taskId: task.id,

                agent: task.agent,

                question: task.question,

                result,

                success: true

              };

            } catch (error) {

              console.error(
                `Task ${task.id} failed:`,
                error.message
              );


              return {

                taskId: task.id,

                agent: task.agent,

                question: task.question,

                result: null,

                success: false,

                error: error.message

              };

            }

          }
        )

      );


    // =====================================
    // 5. SAVE RESULTS
    // =====================================

    for (const result of roundResults) {

      results.push(result);

      completedTasks.add(
        result.taskId
      );

    }


    console.log(
      "\nCompleted tasks:",
      [...completedTasks]
    );

  }


  // =====================================
  // 6. FINAL AGENT
  // =====================================

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

            Combine all agent results into one
            clear answer to the original user request.

            Rules:

            1. Include successful results.
            2. Mention failed tasks when relevant.
            3. Do not invent information.
            4. Do not perform new research.
            5. Use the results produced by the workflow.
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