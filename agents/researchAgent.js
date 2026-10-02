import ollama from "ollama";
import { searchWeb } from "../tools/search.js";

const tools = [
  {
    type: "function",
    function: {
      name: "search_web",

      description:
        "Search the web for information about a topic",

      parameters: {
        type: "object",

        properties: {
          query: {
            type: "string",
            description: "Search query"
          }
        },

        required: ["query"]
      }
    }
  }
];

export async function researchAgent(userMessage) {
  const messages = [
    {
      role: "system",

      content: `
You are a Research Agent.

Your responsibility is research and information gathering.

Use the search_web tool when external information
is required.

Do not perform mathematical calculations unless
they are necessary for understanding research results.

Return a concise research summary.
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

    console.log("Assistant message for Research Agent : ", assistantMessage);

    messages.push(assistantMessage);

    // Agent finished
    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content;
    }

    // Execute tools
    for (const toolCall of assistantMessage.tool_calls) {
      const name = toolCall.function.name;
      const args = toolCall.function.arguments;

      if (name === "search_web") {
        const result = await searchWeb(args.query);

        messages.push({
          role: "tool",
          tool_name: name,
          content: JSON.stringify(result)
        });
      }
    }
  }
}