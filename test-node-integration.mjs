#!/usr/bin/env node
/** Node runner: integration tests (live backend). */
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
const NODE = process.env.NODE22 || process.execPath;
import { join, relative, resolve } from "node:path";

process.env.CI = "true";
const PER_FILE_TIMEOUT_MS = 180_000;

function collectTests(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) results.push(...collectTests(full));
    else if (entry.endsWith(".test.ts")) results.push(full);
  }
  return results.sort();
}

const testDir = resolve("tests/integration");
const files = collectTests(testDir);
console.log(`Found ${files.length} integration test files\n`);
let failed = 0;
for (const file of files) {
  const rel = relative(process.cwd(), file);
  console.log(`▶ ${rel}`);
  const result = spawnSync(
    NODE,
    ["--import", "tsx", "--test-force-exit", file],
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
