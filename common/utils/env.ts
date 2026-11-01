/**
 * Read a process environment variable (server side only).
 * Returns undefined in the browser or when the variable is not set.
 */
export function getEnv(name: string): string | undefined {
  const deno = (globalThis as {
    Deno?: { env?: { get: (key: string) => string | undefined } };
  }).Deno;
  if (deno?.env?.get) return deno.env.get(name);
  const value = (globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env?.[name];
  return typeof value === "string" ? value : undefined;
}

/** Read a positive integer env var, falling back to `fallback` on empty/invalid values. */
export function getEnvInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(getEnv(name) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
