import ollama from "ollama";

export async function mathAgent(question) {
  try {
    const response = await ollama.chat({
      model: "gpt-oss:120b-cloud",
      messages: [
        {
          role: "system",
          content: `
You are a Math Agent.

Perform calculations using the data provided by the workflow.

Rules:

1. Use only the numeric data provided.
2. Never invent a number.
3. Never create an illustrative example.
4. Never replace missing data with an estimate.
5. If required data is missing, return:

ERROR: Missing required numeric data

For USD/INR conversion:

USD = INR amount / USD_INR rate

Return the calculation clearly.
`
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    return response.message.content;
  } catch (error) {
    throw new Error(`Math Agent failed: ${error.message}`);
  }
}