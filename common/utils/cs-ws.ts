/**
 * Public API / WS base for customer-service chat (browser-facing).
 */
import { getEnv } from "@common/utils/env.ts";

/** HTTP origin of the api app (no trailing slash). */
export function apiPublicBase(): string {
  const configured = getEnv("API_PUBLIC_BASE")?.replace(/\/$/, "");
  if (configured) return configured;
  const port = getEnv("APP_PORT_API") ?? "3003";
  const host = getEnv("APP_HOST") ?? "127.0.0.1";
  return `http://${host}:${port}`;
}

/** Customer-service WebSocket URL — same port as api HTTP, path `/ws`. */
export function csWsUrl(): string {
  const http = apiPublicBase();
  if (http.startsWith("https://")) return `wss://${http.slice("https://".length)}/ws`;
  if (http.startsWith("http://")) return `ws://${http.slice("http://".length)}/ws`;
  return `ws://${http}/ws`;
}
