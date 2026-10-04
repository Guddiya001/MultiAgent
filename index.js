import { currencyWorkflow } from "./workflow/currencyWorkflow.js";

const userMessage = process.argv.slice(2).join(" ");

if (!userMessage) {
  console.log(
    'Usage: npm start -- "your question"'
  );

  process.exit(1);
}

try {

  console.log("\nUser:");
  console.log(userMessage);

  const result =
    await currencyWorkflow(userMessage);

  console.log("\nFinal Answer:");
  console.log(result);

} catch (error) {

  console.error("\nWorkflow Error:");
  console.error(error);

}