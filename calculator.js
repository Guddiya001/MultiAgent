export function calculator(expression) {
  try {
    const allowed = /^[0-9+\-*/().%\s]+$/;

    if (!allowed.test(expression)) {
      throw new Error("Invalid mathematical expression");
    }

    const result = Function(`"use strict"; return (${expression})`)();

     
/* it contains a function that evaluates the mathematical expression using the Function constructor. The expression is passed as a string and executed in strict mode. For example, if the expression is "125 * 48", the function will return the result of that calculation, which is 6000.
    function () {
  "use strict";
  return (125 * 48);
  }
*/
    if (!Number.isFinite(result)) {
      throw new Error("Invalid calculation");
    }

    return result;
  } catch (error) {
    return `Calculation error: ${error.message}`;
  }
}

//const result = calculator("25 * 2"); // Example usage
//console.log(result);
