import ollama from "ollama";
import { calculator } from "../tools/calculator.js";

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
  }
];

export async function mathAgent(userMessage) {
  const messages = [
    {
      role: "system",
      content: `
You are a Math Agent.

Your responsibility is only mathematics.

Use the calculator tool when calculation is required.

Return a clear mathematical answer.
`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  while (true) {
    const response = await ollama.chat({
      model: "gpt-oss:120b-cloud",
      messages,
      tools
    });

    const assistantMessage = response.message;

    console.log("Assistant message for Math Agent : ", assistantMessage);

    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const args = toolCall.function.arguments;

      const result = calculator(args.expression);

      messages.push({
        role: "tool",
        tool_name: "calculator",
        content: JSON.stringify(result)
      });
    }
  }
}