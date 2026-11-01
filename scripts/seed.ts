/**
 * Manual seed: `deno task seed`. Needs the database config the same way the app does.
 * The app also seeds on startup; this is for CI / manual re-seeding.
 */
import { initDatabase } from "@dreamer/database";
import config from "@common/config/main.ts";
import { seedAll } from "@common/service/seed.ts";

await initDatabase(config.database.default as never);
await seedAll();
console.log("seed done");
Deno.exit(0);
