import ollama from "ollama";
import { getWeather } from "../tools/weather.js";

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a city",
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

export async function weatherAgent(userMessage) {
  const messages = [
    {
      role: "system",
      content: `
You are a Weather Agent.

Your responsibility is weather-related questions.

Use the weather tool when current weather information is required.

Return a clear weather answer.
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

    console.log("Assistant message for Weather Agent : ", assistantMessage);

    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const args = toolCall.function.arguments;

      const result = await getWeather(args.city);

      messages.push({
        role: "tool",
        tool_name: "get_weather",
        content: JSON.stringify(result)
      });
    }
  }
}