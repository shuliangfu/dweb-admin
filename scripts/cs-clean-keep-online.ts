/**
 * One-shot: keep only the two currently-online CS guest sessions; delete the rest.
 * Also clear claim fields on keepers so they stay 待认领 for claim MVP test.
 */
import { initDatabase } from "@dreamer/database";
import { getEnv, getEnvInt } from "@common/utils/env.ts";
import { CsMessage, CsSession } from "@common/models/mod.ts";

const KEEP = new Set([
  "6aeebf60e1c0d87abffa1a69",
  "6aeebfc7e1c0d87abffa1a6a",
]);

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
  mongoOptions: {
    directConnection: true,
    serverSelectionTimeoutMS: 10000,
  },
});

const all = await CsSession.findAll({}) as Array<{
  _id?: string;
  guestName?: string;
  guestOnline?: boolean;
  claimedByAdminId?: string | null;
  status?: string;
}>;

const keepRows: typeof all = [];
const dropRows: typeof all = [];
for (const r of all) {
  const id = String(r._id ?? "");
  if (KEEP.has(id)) keepRows.push(r);
  else dropRows.push(r);
}

let deletedSessions = 0;
let deletedMessages = 0;
for (const r of dropRows) {
  const id = String(r._id ?? "");
  if (!id) continue;
  try {
    const n = await CsMessage.deleteMany({ sessionId: id });
    deletedMessages += typeof n === "number" ? n : 0;
  } catch (e) {
    console.error("delete messages fail", id, e);
  }
  try {
    await CsSession.deleteById(id);
    deletedSessions += 1;
  } catch (e) {
    console.error("delete session fail", id, e);
  }
}

// Clear claim on keepers + ensure not hidden so they show in 待认领
for (const r of keepRows) {
  const id = String(r._id ?? "");
  await CsSession.updateById(id, {
    claimedByAdminId: null,
    claimedByName: null,
    claimedAt: null,
    hiddenAt: null,
    hideSource: null,
    guestOnline: true,
    status: "open",
  });
}

console.log(JSON.stringify({
  db: dbName,
  totalBefore: all.length,
  deletedSessions,
  deletedMessages,
  kept: keepRows.map((r) => ({
    sessionId: String(r._id),
    guestName: r.guestName ?? "",
    guestOnline: r.guestOnline === true,
    clearedClaim: true,
  })),
  keepIds: [...KEEP],
}, null, 2));

Deno.exit(0);
