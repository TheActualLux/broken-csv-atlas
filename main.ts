// The program the harness runs (node /bot/main.ts, node 22). It reads every case from
// $MAKEFUN_INPUT_DIR/cases.json (a JSON array of {id, input}), answers each case alone with
// run() from solve.js, and writes $MAKEFUN_OUTPUT_DIR/answers.json: a JSON array of the answers,
// one per case and in the cases' order. /input and /output stand in outside a container.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

// V8's incremental marking off, set before solve.js is imported so all of its work runs under it.
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
