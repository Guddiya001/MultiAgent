import ollama from "ollama";
import { mathAgent } from "./mathAgent.js";
import { weatherAgent } from "./weatherAgent.js";
import { researchAgent } from "./researchAgent.js";

const agents = {
    math: mathAgent,
    weather: weatherAgent,
    research: researchAgent
};

const tools = [
    {
        type: "function",
        function: {
            name: "math_agent",
            description: "Delegate mathematical questions to the Math Agent",
            parameters: {
                type: "object",
                properties: {
                    question: {
                        type: "string"
                    }
                },
                required: ["question"]
            }
        }
    },

    {
        type: "function",
        function: {
            name: "weather_agent",
            description: "Delegate weather questions to the Weather Agent",
            parameters: {
                type: "object",
                properties: {
                    question: {
                        type: "string"
                    }
                },
                required: ["question"]
            }
        }
    },

    {
        type: "function",
        function: {
            name: "research_agent",
            description: "Delegate research questions to the Research Agent",
            parameters: {
                type: "object",
                properties: {
                    question: {
                        type: "string"
                    }
                },
                required: ["question"]
            }
        }
    }
];

export async function supervisor(userMessage) {
    const messages = [
        {
            role: "system",
            content: `
You are a Supervisor Agent.

Your job is to understand the user's request
and delegate it to the appropriate specialized agent.

Available agents:

1. math_agent
   Handles mathematical questions.

2. weather_agent
   Handles weather questions.

3. research_agent
   Handles research questions.

Do not perform the task yourself when a specialized
agent is available.
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

        console.log("Assistant message for Supervisor Agent : ", assistantMessage);

        messages.push(assistantMessage);

        if (!assistantMessage.tool_calls?.length) {
            return assistantMessage.content;
        }

        for (const toolCall of assistantMessage.tool_calls) {
            const name = toolCall.function.name;
            const args = toolCall.function.arguments;

            let result;

            if (name === "math_agent") {
                result = await agents.math(args.question);
            }

            if (name === "weather_agent") {
                result = await agents.weather(args.question);
            }

            if (name === "research_agent") {
                result = await agents.research(args.question);
            }

            messages.push({
                role: "tool",
                tool_name: name,
                content: result
            });
        }
    }
}