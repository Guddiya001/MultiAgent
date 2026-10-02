import { supervisor } from "./agents/supervisor.js";

const userMessage = process.argv.slice(2).join(" ");

if (!userMessage) {
  console.log('Usage: npm start -- "your question"');
  process.exit(1);
}

try {
  console.log("\nUser:", userMessage);

  const result = await supervisor(userMessage);

  console.log("\nFinal Answer:");
  console.log(result);
} catch (error) {
  console.error("\nAgent Error:");
  console.error(error.message);
}