import ollama from "ollama";
import { getExchangeRate } from "../tools/exchangeRate.js";

export async function researchAgent(question) {
  try {
    const lowerQuestion = question.toLowerCase();

    if (
      lowerQuestion.includes("usd") &&
      lowerQuestion.includes("inr")
    ) {
      const exchangeRate =
        await getExchangeRate("USD", "INR");

      return exchangeRate;
    }

    const response = await ollama.chat({
      model: "gpt-oss:120b-cloud",
      messages: [
        {
          role: "system",
          content: `
You are a Research Agent.

Return concise factual information.

Do not invent information.
`
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    return {
      result: response.message.content
    };

  } catch (error) {
    return {
      error: `Research Agent failed: ${error.message}`
    };
  }
}