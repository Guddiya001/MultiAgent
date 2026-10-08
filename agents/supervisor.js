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
  console.log("LEVEL 8.5 WORKFLOW");
  console.log("==============================");


  // =====================================
  // 1. CREATE PLAN
  // =====================================

  console.log("\n1. Creating execution plan...");

  const plan = await createPlan(userMessage);

  console.log("\nExecution Plan:");

  console.dir(plan, { depth: null });


  // =====================================
  // 2. VALIDATE PLAN
  // =====================================

  validatePlan(plan);


  // =====================================
  // 3. CREATE WORKFLOW STATE
  // =====================================

  const taskState = new Map();

  for (const task of plan.tasks) {

    taskState.set(task.id, {
      status: "PENDING",
      result: null,
      error: null
    });

  }


  // =====================================
  // 4. EXECUTE DAG
  // =====================================

  console.log("\n2. Starting workflow...");


  while (
    [...taskState.values()]
      .some(
        (state) =>
          state.status === "PENDING"
      )
  ) {

    const readyTasks = [];


    // ===================================
    // Find READY tasks
    // ===================================

    for (const task of plan.tasks) {

      const state =
        taskState.get(task.id);


      if (state.status !== "PENDING") {
        continue;
      }


      const dependencies =
        task.dependsOn || [];


      // -------------------------------
      // Check dependency states
      // -------------------------------

      const dependencyStates =
        dependencies.map(
          (id) =>
            taskState.get(id)
        );


      // Dependency failed/skipped
      const dependencyFailed =
        dependencyStates.some(
          (dependency) =>
            dependency.status === "FAILED" ||
            dependency.status === "SKIPPED"
        );


      if (dependencyFailed) {

        state.status = "SKIPPED";

        state.error =
          "Skipped because a dependency failed.";

        console.log(
          `⏭️ Task ${task.id} skipped`
        );

        continue;
      }


      // Dependencies not finished
      const dependenciesComplete =
        dependencyStates.every(
          (dependency) =>
            dependency.status === "SUCCESS"
        );


      if (!dependenciesComplete) {
        continue;
      }


      // Task is ready
      state.status = "READY";

      readyTasks.push(task);

    }


    // =====================================
    // No ready tasks
    // =====================================

    if (readyTasks.length === 0) {

      const pendingTasks =
        plan.tasks.filter(
          (task) =>
            taskState.get(task.id)
              .status === "PENDING"
        );


      if (pendingTasks.length > 0) {

        throw new Error(
          "Workflow is stuck. " +
          "Possible circular dependency."
        );

      }

      break;

    }


    console.log(
      `\nReady tasks: ${readyTasks
        .map((task) => task.id)
        .join(", ")}`
    );


    // =====================================
    // Execute READY tasks in parallel
    // =====================================

    const roundResults =
      await Promise.all(

        readyTasks.map(
          async (task) => {

            const state =
              taskState.get(task.id);


            state.status = "RUNNING";


            console.log(
              `Starting Task ${task.id}: ${task.agent}`
            );


            const agent =
              agents[task.agent];


            // -------------------------------
            // Unknown agent
            // -------------------------------

            if (!agent) {

              state.status = "FAILED";

              state.error =
                `Unknown agent: ${task.agent}`;

              return {
                taskId: task.id,
                success: false
              };

            }


            // -------------------------------
            // Dependency results
            // -------------------------------

            const dependencyResults =
              (task.dependsOn || []).map(
                (dependencyId) => {

                  const dependencyTask =
                    taskState.get(
                      dependencyId
                    );

                  return {
                    taskId: dependencyId,
                    result:
                      dependencyTask.result
                  };

                }
              );


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


                    Use dependency results when required.

                    Do not invent missing information.

                    `;


            try {

              const result =
                await agent(agentInput);


              state.status = "SUCCESS";

              state.result = result;


              console.log(
                `✅ Finished Task ${task.id}`
              );


              return {
                taskId: task.id,
                success: true,
                result
              };

            } catch (error) {

              state.status = "FAILED";

              state.error =
                error.message;


              console.error(
                `❌ Task ${task.id} failed:`,
                error.message
              );


              return {
                taskId: task.id,
                success: false,
                error: error.message
              };

            }

          }
        )

      );


    // =====================================
    // Print round results
    // =====================================

    console.log("\nRound Results:");

    console.dir(
      roundResults,
      { depth: null }
    );

  }


  // =====================================
  // 5. BUILD FINAL RESULTS
  // =====================================

  const finalResults =
    plan.tasks.map(
      (task) => {

        const state =
          taskState.get(task.id);

        return {

          taskId: task.id,

          agent: task.agent,

          question: task.question,

          status: state.status,

          result: state.result,

          error: state.error

        };

      }
    );


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

                Use the workflow results to answer
                the original user request.

                Rules:

                1. Include successful results.
                2. Clearly explain failed tasks.
                3. Clearly explain skipped tasks.
                4. Do not invent missing information.
                5. Do not perform new research.
                `
        },

        {
          role: "user",

          content: `

                  Original request:

                  ${userMessage}


                  Execution plan:

                  ${JSON.stringify(
                              plan,
                              null,
                              2
                            )}


                  Workflow results:

                  ${JSON.stringify(
                              finalResults,
                              null,
                              2
                            )}

                  `

        }

      ]

    });


  return finalResponse.message.content;
}


// =====================================
// PLAN VALIDATION
// =====================================

function validatePlan(plan) {

  if (
    !plan ||
    !Array.isArray(plan.tasks)
  ) {

    throw new Error(
      "Planner returned an invalid task list."
    );

  }


  const taskIds =
    new Set();


  for (const task of plan.tasks) {

    // -------------------------------
    // Validate ID
    // -------------------------------

    if (
      typeof task.id !== "number"
    ) {

      throw new Error(
        "Every task must have a numeric id."
      );

    }


    // Duplicate ID
    if (taskIds.has(task.id)) {

      throw new Error(
        `Duplicate task id: ${task.id}`
      );

    }

    taskIds.add(task.id);


    // -------------------------------
    // Validate agent
    // -------------------------------

    if (
      typeof task.agent !== "string"
    ) {

      throw new Error(
        `Task ${task.id} has an invalid agent.`
      );

    }


    if (!agents[task.agent]) {

      throw new Error(
        `Task ${task.id} references unknown agent: ${task.agent}`
      );

    }


    // -------------------------------
    // Validate question
    // -------------------------------

    if (
      typeof task.question !== "string" ||
      !task.question.trim()
    ) {

      throw new Error(
        `Task ${task.id} has no valid question.`
      );

    }


    // -------------------------------
    // Validate dependencies
    // -------------------------------

    if (
      !Array.isArray(task.dependsOn)
    ) {

      throw new Error(
        `Task ${task.id} must have a dependsOn array.`
      );

    }

  }


  // =================================
  // Validate dependency IDs
  // =================================

  for (const task of plan.tasks) {

    for (
      const dependencyId
      of task.dependsOn
    ) {

      if (!taskIds.has(dependencyId)) {

        throw new Error(
          `Task ${task.id} depends on missing task ${dependencyId}`
        );

      }


      if (dependencyId === task.id) {

        throw new Error(
          `Task ${task.id} cannot depend on itself.`
        );

      }

    }

  }

}