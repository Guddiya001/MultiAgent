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

async function executeTool(toolCall) {
  const name = toolCall.function.name;
  const args = toolCall.function.arguments;

  console.log(`\nCalling tool: ${name}`);
  console.log("Arguments:", args);

  switch (name) {
    case "calculator":
      return calculator(args.expression);

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
        "You are an AI agent. Use tools when necessary."
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

    messages.push(assistantMessage);

    // No tools needed
    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content;
    }

    // Execute all requested tools
    for (const toolCall of assistantMessage.tool_calls) {
      const result = await executeTool(toolCall);

      console.log("Result:", result);

      messages.push({
        role: "tool",
        tool_name: toolCall.function.name,
        content: JSON.stringify(result)
      });
    }
  }
}