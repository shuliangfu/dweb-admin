/**
 * Local-dev origin allowlist from APP_PORT_* / HOST_PORT_* (no hardcoded 300x/310x).
 */
import { getEnv } from "@common/utils/env.ts";

const DEFAULT_PORTS = {
  backend: "8810",
  frontend: "8811",
  mobile: "8812",
  api: "8813",
} as const;

/** Port strings used by local FE / mobile / backend / api (env + defaults). */
export function localAppPorts(): string[] {
  const ports = new Set<string>([
    getEnv("APP_PORT_BACKEND") ?? DEFAULT_PORTS.backend,
    getEnv("APP_PORT_FRONTEND") ?? DEFAULT_PORTS.frontend,
    getEnv("APP_PORT_MOBILE") ?? DEFAULT_PORTS.mobile,
    getEnv("APP_PORT_API") ?? DEFAULT_PORTS.api,
    getEnv("HOST_PORT_BACKEND") ?? "",
    getEnv("HOST_PORT_FRONTEND") ?? "",
    getEnv("HOST_PORT_MOBILE") ?? "",
    getEnv("HOST_PORT_API") ?? "",
  ]);
  return [...ports].filter(Boolean);
}

/** http(s)://127.0.0.1|localhost|[::1]:<port> for each local app port. */
export function localCorsOrigins(): string[] {
  const hosts = ["127.0.0.1", "localhost", "[::1]"];
  const out: string[] = [];
  for (const h of hosts) {
    for (const port of localAppPorts()) {
      out.push(`http://${h}:${port}`);
      out.push(`https://${h}:${port}`);
    }
  }
  const pub = getEnv("API_PUBLIC_BASE")?.replace(/\/$/, "");
  if (pub?.startsWith("http://") || pub?.startsWith("https://")) {
    try {
      const u = new URL(pub);
      out.push(`${u.protocol}//${u.host}`);
    } catch {
      // ignore
    }
  }
  return [...new Set(out)];
}
