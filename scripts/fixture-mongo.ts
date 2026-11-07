/**
 * Regenerate sanitized Mongo fixtures for CI:
 *   deno task fixture:mongo
 *
 * Writes BSON dumps under tests/fixtures/mongo/ for:
 *   admin_users, menus, auth_items, auth_routes, auth_item_children, site_settings
 *
 * Admin is test-only: username/password from SEED_ADMIN_* (default admin/admin888),
 * no totpPending/totpSecret/passkey fields.
 *
 * Requires a reachable Mongo (see .env) and either:
 *   - `mongodump` on PATH, or
 *   - Docker container named by FIXTURE_MONGO_CONTAINER (default dweb-admin-mongo).
 */
import { initDatabase } from "@dreamer/database";
import config from "@common/config/main.ts";
import { seedAll } from "@common/service/seed.ts";
import { getEnv } from "@common/utils/env.ts";
import { hashPassword } from "@common/service/password.ts";

const COLLECTIONS = [
  "admin_users",
  "menus",
  "auth_items",
  "auth_routes",
  "auth_item_children",
  "site_settings",
] as const;

const OUT_DIR = "tests/fixtures/mongo";
const TMP_DB = "dweb_admin_fixture";
const CONTAINER = getEnv("FIXTURE_MONGO_CONTAINER") || "dweb-admin-mongo";

async function sh(cmd: string[], opts: { allowFail?: boolean } = {}) {
  const p = new Deno.Command(cmd[0], { args: cmd.slice(1), stdout: "piped", stderr: "piped" });
  const { code, stdout, stderr } = await p.output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);
  if (code !== 0 && !opts.allowFail) {
    throw new Error(`${cmd.join(" ")}\n${err || out}`);
  }
  return { code, out, err };
}

async function hasMongodump(): Promise<boolean> {
  const r = await sh(["bash", "-lc", "command -v mongodump"], { allowFail: true });
  return r.code === 0 && r.out.trim().length > 0 && !r.out.includes("/home/docker/bin/");
}

await initDatabase(config.database.default as never);
await seedAll();

const username = getEnv("SEED_ADMIN_USERNAME") || "admin";
const password = getEnv("SEED_ADMIN_PASSWORD") || "admin888";

// Use the app models via raw mongosh-less path: reopen through Deno.Command + mongosh homebrew/docker.
const host = getEnv("DB_HOST") || "127.0.0.1";
const port = getEnv("DB_PORT") || "27017";
const dbName = getEnv("DB_NAME") || "dweb_admin";
const user = getEnv("DB_USER") || "";
const pass = getEnv("DB_PASS") || "";
const auth = getEnv("DB_AUTH_SOURCE") || "admin";
const uri = user
  ? `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/?authSource=${auth}`
  : `mongodb://${host}:${port}`;

const hash = await hashPassword(password);
const sanitizeJs = `
const src = db.getSiblingDB(${JSON.stringify(dbName)});
const dst = db.getSiblingDB(${JSON.stringify(TMP_DB)});
dst.dropDatabase();
const cols = ${JSON.stringify([...COLLECTIONS])};
for (const c of cols) {
  if (c === "admin_users") continue;
  const docs = src[c].find().toArray();
  if (docs.length) dst[c].insertMany(docs);
  print(c + ":" + docs.length);
}
dst.admin_users.insertOne({
  username: ${JSON.stringify(username)},
  password: ${JSON.stringify(hash)},
  nickname: "Administrator",
  roleCodes: ["super_admin"],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
});
print("admin_users:1 sanitized");
`;

const mongoshBin = (await sh(["bash", "-lc", "command -v /opt/homebrew/bin/mongosh || command -v mongosh"], { allowFail: true })).out.trim().split("\n").pop()!;
if (!mongoshBin || mongoshBin.includes("/home/docker/bin/")) {
  // fall back to docker exec mongosh inside project mongo
  await sh(["docker", "exec", CONTAINER, "mongosh", "--quiet", "--eval", sanitizeJs]);
} else {
  await sh([mongoshBin, "--quiet", uri, "--eval", sanitizeJs]);
}

await Deno.remove(OUT_DIR, { recursive: true }).catch(() => {});
await Deno.mkdir(OUT_DIR, { recursive: true });

const dumpOnHost = await hasMongodump();
if (dumpOnHost) {
  await sh(["mongodump", `--uri=${uri}`, `--db=${TMP_DB}`, `--out=/tmp/dweb-fixture-out`]);
  for (const c of COLLECTIONS) {
    await sh(["bash", "-lc", `cp /tmp/dweb-fixture-out/${TMP_DB}/${c}.* ${OUT_DIR}/`]);
  }
} else {
  await sh(["docker", "exec", CONTAINER, "rm", "-rf", "/tmp/dweb-mongo-fixture"]);
  await sh(["docker", "exec", CONTAINER, "mkdir", "-p", "/tmp/dweb-mongo-fixture"]);
  for (const c of COLLECTIONS) {
    await sh([
      "docker",
      "exec",
      CONTAINER,
      "mongodump",
      `--db=${TMP_DB}`,
      `--collection=${c}`,
      "--out=/tmp/dweb-mongo-fixture",
    ]);
  }
  await sh(["docker", "cp", `${CONTAINER}:/tmp/dweb-mongo-fixture/${TMP_DB}/.`, OUT_DIR]);
}

// drop temp db
const dropJs = `db.getSiblingDB(${JSON.stringify(TMP_DB)}).dropDatabase(); print("dropped ${TMP_DB}")`;
if (!mongoshBin || mongoshBin.includes("/home/docker/bin/")) {
  await sh(["docker", "exec", CONTAINER, "mongosh", "--quiet", "--eval", dropJs]);
} else {
  await sh([mongoshBin, "--quiet", uri, "--eval", dropJs]);
}

console.log(`fixture written to ${OUT_DIR}/ (${COLLECTIONS.join(", ")})`);
Deno.exit(0);
