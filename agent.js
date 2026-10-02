import ollama from "ollama";
import { calculator } from "./calculator.js";
import { getWeather } from "./weather.js";

const tools = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Calculate a mathematical expression",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression"
          }
        },
        required: ["expression"]
      }
    }
  },

  // {
  //   type: "function",
  //   function: {
  //     name: "get_weather",
  //     description: "Get current weather for a location",
  //     parameters: {
  //       type: "object",
  //       properties: {
  //         latitude: {
  //           type: "number",
  //           description: "Latitude of the location"
  //         },
  //         longitude: {
  //           type: "number",
  //           description: "Longitude of the location"
  //         }
  //       },
  //       required: ["latitude", "longitude"]
  //     }
  //   }
  // }

  {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather for a city",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name"
        }
      },
      required: ["city"]
    }
  }
}
];


async function executeTool(name, args) {
  switch (name) {
    case "calculator":
      return calculator(args.expression);

    // case "get_weather":
    //   return await getWeather(
    //     args.latitude,
    //     args.longitude
    //   );
    case "get_weather":
      return await getWeather(args.city);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function runAgent(userMessage) {
  const messages = [
    {
      role: "system",
      content:
        "You are an AI agent. Use the available tools when necessary."
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  while (true) {
    const response = await ollama.chat({
      model: "gpt-oss:120b-cloud", // "gemma3:4b",
      messages,
      tools
    });

    const assistantMessage = response.message;
    console.log("\nOllama assistantMessage:", assistantMessage.content);

    messages.push(assistantMessage);

    // No tool call
    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content;
    }

    // Execute requested tools
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments;

      console.log("\nTool selected:", toolName);
      console.log("Arguments:", toolArgs);

      const result = await executeTool(
        toolName,
        toolArgs
      );

      console.log("Tool result:", result);

      messages.push({
        role: "tool",
        tool_name: toolName,
        content: JSON.stringify(result)
      });
    }
  }
}


// import ollama from "ollama";
// import { calculator } from "./calculator.js";

// const tools = {
//   calculator
// };

// export async function runAgent(userMessage) {
//   const messages = [
//     {
//       role: "system",
//       content: `
// You are a simple AI agent.

// You have access to a calculator tool.

// When the user asks a mathematical question:
// 1. Decide whether the calculator is required.
// 2. If required, respond ONLY in this format:

// TOOL: calculator
// INPUT: mathematical expression

// For example:

// TOOL: calculator
// INPUT: 25 * 40

// If no tool is required, answer normally.
// `
//     },
//     {
//       role: "user",
//       content: userMessage
//     }
//   ];

//   const response = await ollama.chat({
//     model: "gemma3:4b",
//     messages
//   });

//   const output = response.message.content.trim();

//   console.log("\nOllama:", output);

//   if (output.startsWith("TOOL: calculator")) {
//     const inputLine = output
//       .split("\n")
//       .find(line => line.startsWith("INPUT:"));

//     if (!inputLine) {
//       throw new Error("Calculator input not found");
//     }

//     const expression = inputLine
//       .replace("INPUT:", "")
//       .trim();

//     console.log("Tool:", "calculator");
//     console.log("Input:", expression);

//     const result = tools.calculator(expression);

//     console.log("Tool Result:", result);

//     messages.push({
//       role: "assistant",
//       content: output
//     });

//     messages.push({
//       role: "user",
//       content: `Calculator result: ${result}

// Now give the final answer to the user.`
//     });

//     const finalResponse = await ollama.chat({
//       model: "gemma3:4b",
//       messages
//     });

//     return finalResponse.message.content;
//   }

//   return output;
// }