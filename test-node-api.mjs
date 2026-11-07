#!/usr/bin/env node
/** Node API runner — @dreamer/test login-gate (+ auth if compatible). */
import { spawnSync } from "node:child_process";
const NODE = process.env.NODE22 || process.execPath;
import { relative, resolve } from "node:path";

process.env.CI = "true";
const PER_FILE_TIMEOUT_MS = 180_000;
const FILES = [
  "tests/api/login-gate.test.ts",
];

let failed = 0;
for (const file of FILES) {
  const full = resolve(file);
  const rel = relative(process.cwd(), full);
  console.log(`▶ ${rel}`);
  const result = spawnSync(
    NODE,
    ["--import", "tsx", "--test-force-exit", full],
    {
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
      timeout: PER_FILE_TIMEOUT_MS,
    },
  );
  if (result.status !== 0) {
    failed = 1;
    console.error(`✖ ${rel}\n`);
  } else console.log(`✔ ${rel}\n`);
}
process.exit(failed);
