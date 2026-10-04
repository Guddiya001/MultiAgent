import { supervisor } from "./agents/supervisor.js";

const userMessage =
  process.argv.slice(2).join(" ");


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
    await supervisor(userMessage);


  console.log("\n==============================");

  console.log("FINAL ANSWER");

  console.log("==============================");


  console.log(result);


} catch (error) {

  console.error(
    "\nWorkflow Error:"
  );

  console.error(
    error.message
  );

}