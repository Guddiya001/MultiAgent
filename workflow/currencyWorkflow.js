import ollama from "ollama";
import { researchAgent } from "../agents/researchAgent.js";
import { mathAgent } from "../agents/mathAgent.js";
import { sleep } from "../utils/retry.js";


/**
 * Validate Research Agent output
 */
function validateExchangeRate(result) {
  try {
    const data =
      typeof result === "string"
        ? JSON.parse(result)
        : result;

    // Research failed
    if (data.error) {
      return {
        valid: false,
        error: data.error
      };
    }

    // Validate currency pair
    if (data.currencyPair !== "USD/INR") {
      return {
        valid: false,
        error: "Invalid currency pair"
      };
    }

    // Validate rate
    if (
      typeof data.rate !== "number" ||
      !Number.isFinite(data.rate) ||
      data.rate <= 0
    ) {
      return {
        valid: false,
        error: "Invalid USD/INR exchange rate"
      };
    }

    return {
      valid: true,
      data
    };

  } catch (error) {
    return {
      valid: false,
      error: "Research Agent returned invalid JSON"
    };
  }
}


/**
 * Research with retry
 */
async function researchExchangeRate(
  maxRetries = 3,
  baseDelay = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {

    console.log(
      `\nResearch attempt ${attempt}/${maxRetries}`
    );

    const result = await researchAgent(`
Find the current USD to INR exchange rate.

I specifically need:

- 1 USD = how many INR
- currency pair
- numeric exchange rate
- unit
- source

Do NOT provide an example.

Do NOT estimate the rate.

Do NOT provide a formula.

Return ONLY valid JSON.

If you cannot obtain a reliable rate, return:

{
  "error": "Unable to obtain current USD/INR rate"
}
`);

    console.log("\nResearch Result:");
    console.dir(result, { depth: null });

    const validation =
      validateExchangeRate(result);

    if (validation.valid) {

      console.log(
        "\n✅ Research result validated successfully."
      );

      return validation.data;
    }

    console.log(
      `\n❌ Validation failed: ${validation.error}`
    );

    // No retry after the final attempt
    if (attempt === maxRetries) {
      break;
    }

    // Exponential backoff
    const delay =
      baseDelay * Math.pow(2, attempt - 1);

    console.log(
      `\n⏳ Waiting ${delay / 1000} second(s) before retry...`
    );

    await sleep(delay);
  }

  throw new Error(
    "Unable to obtain a valid USD/INR exchange rate after retries."
  );
}


/**
 * Main Currency Workflow
 */
export async function currencyWorkflow(userRequest) {

  console.log("\n================================");
  console.log("LEVEL 7 CURRENCY WORKFLOW");
  console.log("================================");


  // --------------------------------
  // Shared workflow state
  // --------------------------------

  const state = {

    userRequest,

    researchResult: null,

    mathResult: null,

    finalResult: null

  };


  // --------------------------------
  // STEP 1
  // Research Agent
  // --------------------------------

  console.log("\n1️⃣ Starting Research Agent...");

  try {

    state.researchResult =
      await researchExchangeRate(2);

  } catch (error) {

    console.error(
      "\n❌ Research failed:"
    );

    console.error(error.message);

    return `
Unable to complete the currency conversion.

Reason:
${error.message}
`;
  }


  console.log("\nValidated Research Data:");

  console.dir(
    state.researchResult,
    { depth: null }
  );


  // --------------------------------
  // STEP 2
  // Math Agent
  // --------------------------------

  console.log("\n2️⃣ Starting Math Agent...");

  const rate = state.researchResult.rate;

  state.mathResult = await mathAgent(`

User request:

${state.userRequest}

Research Agent result:

${JSON.stringify(
  state.researchResult,
  null,
  2
)}

The user wants to convert:

₹100,000

to USD.

Use this exact exchange rate:

1 USD = ${rate} INR

Calculate:

USD = 100000 / ${rate}

Rules:

- Use the exact rate provided.
- Do not invent another rate.
- Do not use an example.
- Do not provide a formula without calculating it.
- Return the actual result.
- Clearly show the calculation.

`);


  console.log("\nMath Result:");

  console.log(state.mathResult);


  // --------------------------------
  // STEP 3
  // Final Agent
  // --------------------------------

  console.log("\n3️⃣ Starting Final Agent...");

  const finalResponse = await ollama.chat({

    model: "gpt-oss:120b-cloud",

    messages: [

      {
        role: "system",

        content: `
You are the Final Response Agent.

Combine the Research Agent result
and Math Agent result into one clear answer.

Rules:

1. Use only the supplied data.
2. Do not invent information.
3. Do not change the exchange rate.
4. Clearly mention the exchange rate.
5. Clearly mention the calculation.
6. Clearly mention the source if available.
`
      },

      {
        role: "user",

        content: `

User request:

${state.userRequest}


Research Agent result:

${JSON.stringify(
  state.researchResult,
  null,
  2
)}


Math Agent result:

${state.mathResult}


Provide the final answer.

`
      }

    ]

  });


  state.finalResult =
    finalResponse.message.content;


  console.log("\n================================");
  console.log("FINAL RESULT");
  console.log("================================");

  console.log(state.finalResult);


  return state.finalResult;
}