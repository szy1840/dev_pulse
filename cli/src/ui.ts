import pc from "picocolors";
import { createInterface } from "node:readline";

export const ui = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(`${pc.green("✓")} ${msg}`),
  warn: (msg: string) => console.log(`${pc.yellow("!")} ${msg}`),
  error: (msg: string) => console.error(`${pc.red("✗")} ${msg}`),
  dim: (msg: string) => console.log(pc.dim(msg)),
  heading: (msg: string) => console.log(pc.bold(msg)),
  pc,
};

/** Prompt for a single line of input (used for the login token). */
export function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
