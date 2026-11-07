/**
 * api 应用入口
 * 配置由 common/config + api/config 自动加载并合并
 *
 * Port pin: APP_PORT_API (default 8813). @dreamer/server would silently
 * fall to port+N when busy — we refuse that so FE/WS stay aligned.
 */
import { App, getServer } from "@dreamer/dweb";
import { registerCsChatWs } from "@api/ws-chat.ts";
import {
  installClamAvCompleteGuard,
  installUploadFileRoute,
} from "@api/cs-upload.ts";
import { getEnv, getEnvInt } from "@common/utils/env.ts";

const API_HOST = getEnv("APP_HOST") || "127.0.0.1";
const API_PORT = getEnvInt("APP_PORT_API", 8813);

/** true when something already accepts TCP on host:port. */
async function isTcpPortTaken(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: host, port });
    try {
      conn.close();
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fail fast if configured port is busy — never let server findAvailablePort
 * quietly move us to 8814/8815 (breaks FE proxy + presence /cs/online).
 */
async function assertApiPortFree(): Promise<void> {
  if (!(await isTcpPortTaken(API_HOST, API_PORT))) return;
  console.error(
    `[api] FATAL: ${API_HOST}:${API_PORT} already in use. ` +
      `Refusing silent port fallback. Clear it then retry, e.g.\n` +
      `  lsof -nP -iTCP:${API_PORT} -sTCP:LISTEN\n` +
      `  kill <pid>`,
  );
  Deno.exit(1);
}

await assertApiPortFree();

const app = new App();

// File download route registered early (pending until init).
installUploadFileRoute(app);

// websocketServer + uploadHandler land after init; wire CS WS + virusScan log on start.
// Note: EventEmitter "start" is BEFORE lifecycle DB connect — ws-chat boot reset waits.
app.on("start", () => {
  registerCsChatWs(app);
  void installClamAvCompleteGuard(app);
});

// After HTTP listen: pin actual port === configured (belt + suspenders).
app.onLifecycle("started", () => {
  try {
    const server = getServer(app.container);
    const actual = server.port;
    if (actual !== API_PORT) {
      console.error(
        `[api] FATAL: listening on ${API_HOST}:${actual}, expected ${API_PORT}. ` +
          `Silent port+N is forbidden for this app.`,
      );
      Deno.exit(1);
    }
    console.log(`[api] listen pinned ${API_HOST}:${actual}`);
  } catch (e) {
    console.error("[api] listen pin check failed", e);
  }
});

app.start();
