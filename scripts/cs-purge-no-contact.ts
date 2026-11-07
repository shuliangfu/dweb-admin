/**
 * One-shot: hard-delete CS sessions with no phone/email contact + their messages.
 * Usage: deno run --env-file=.env -A scripts/cs-purge-no-contact.ts
 * Do NOT wire into listCsSessions / sessions API.
 */
import { initDatabase } from "@dreamer/database";
import { getEnv, getEnvInt } from "@common/utils/env.ts";
import { purgeCsSessionsWithoutContact } from "@common/service/cs.ts";

const dbName = getEnv("DB_NAME") ?? "dweb_admin";
const dbUser = getEnv("DB_USER") ?? "";
const dbPass = getEnv("DB_PASSWORD") ?? "";
await initDatabase({
  adapter: "mongodb",
  connection: {
    host: getEnv("DB_HOST") ?? "127.0.0.1",
    port: getEnvInt("DB_PORT", 27017),
    database: dbName,
    ...(dbUser
      ? {
        username: dbUser,
        password: dbPass,
        authSource: getEnv("DB_AUTH_SOURCE") ?? "admin",
      }
      : {}),
  },
  mongoOptions: { directConnection: true, serverSelectionTimeoutMS: 10000 },
});

const purged = await purgeCsSessionsWithoutContact(500);
console.log(JSON.stringify({ purged, marker: "cs-purge-no-contact-oneshot" }));
Deno.exit(0);
