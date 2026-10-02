import { runAgent } from "./agent.js";

const question = process.argv.slice(2).join(" ");

if (!question) {
  console.log(
    'Usage: npm start -- "your question"'
  );

  process.exit(1);
}

try {
  const answer = await runAgent(question);

  console.log("\nFinal Answer:");
  console.log(answer);
} catch (error) {
  console.error("\nError:", error.message);
}

/*
import { runAgent } from "./agent.js";

const question = process.argv.slice(2).join(" ");

if (!question) {
  console.log('Usage: npm start -- "What is 125 * 48?"');
  process.exit(1);
}

try {
  const answer = await runAgent(question);

  console.log("\nFinal Answer:");
  console.log(answer);
} catch (error) {
  console.error("Agent Error:", error.message);
}
*/