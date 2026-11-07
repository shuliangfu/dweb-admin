#!/usr/bin/env node
/**
 * Node unit runner — @dreamer/test files only (Deno.test suites stay on Deno CI job).
 */
import { spawnSync } from "node:child_process";
const NODE = process.env.NODE22 || process.execPath;
import { relative, resolve } from "node:path";

process.env.CI = "true";

const FILES = [
  "tests/unit/totp-qr.test.ts",
  "tests/unit/cs-ws-url.test.ts",
  "tests/unit/challenge-kind.test.ts",
  "tests/unit/cs.test.ts",
  "tests/unit/example.test.ts",
];

let failed = 0;
for (const file of FILES) {
  const full = resolve(file);
  const rel = relative(process.cwd(), full);
  console.log(`▶ ${rel}`);
  const result = spawnSync(
    NODE,
    ["--import", "tsx", "--test-force-exit", full],
    { stdio: "inherit", env: { ...process.env, CI: "true" } },
  );
  if (result.status !== 0) {
    failed = 1;
    console.error(`✖ ${rel}\n`);
  } else console.log(`✔ ${rel}\n`);
}
process.exit(failed);
