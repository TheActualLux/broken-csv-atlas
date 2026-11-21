// The harness runs `node /bot/main.ts` (Node 22). Read each case, answer it
// independently with solve.js, and write one JSON answer per input case.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

// Match the house driver's V8 setting before importing the parser.
setFlagsFromString('--no-incremental-marking');

const { run } = (await import(new URL('./solve.js', import.meta.url).href)) as {
  run: (input: unknown) => unknown;
};

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8')) as {
  id: string;
  input: unknown;
}[];
const answers: unknown[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) answers[i] = run(cases[i].input);
writeFileSync(join(outputDir, 'answers.json'), JSON.stringify(answers));
