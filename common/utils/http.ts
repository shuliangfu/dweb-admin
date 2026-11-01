/** Small HTTP helpers for API routes. */
export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

/** True when the client prefers an HTML form flow (form post) over JSON. */
export function isFormRequest(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  return type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
}

/**
 * Read a JSON or form body into a plain object.
 * dweb pre-parses JSON bodies into `ctx.body` (the request stream is then consumed),
 * so prefer that and fall back to reading the request ourselves.
 */
export async function readBody(
  ctx: { req: Request; body?: unknown },
): Promise<Record<string, unknown>> {
  if (ctx.body && typeof ctx.body === "object" && !(ctx.body instanceof ReadableStream)) {
    return ctx.body as Record<string, unknown>;
  }
  const req = ctx.req;
  if (isFormRequest(req)) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  }
  try {
    const data = await req.json();
    return data && typeof data === "object" ? data as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** HTTP status for a service error code. */
const ERROR_STATUS: Record<string, number> = {
  invalid: 400,
  notFound: 404,
  usernameExists: 409,
  roleExists: 409,
  menuExists: 409,
  lastSuperAdmin: 409,
  cannotDeleteSelf: 409,
  cannotKickSelf: 409,
  roleInUse: 409,
  hasChildren: 409,
  onlyTwoLevels: 409,
  itemExists: 409,
  cycle: 409,
  routeInvalid: 400,
  routeNotManaged: 409,
  wrongPassword: 400,
  samePassword: 400,
  totpAlready: 409,
  totpNotStarted: 409,
  totpNotEnabled: 409,
  totpWrong: 400,
  challengeExpired: 400,
  passkeyFailed: 400,
  noPasskey: 409,
};

export function errorStatus(code: string): number {
  return ERROR_STATUS[code] ?? 400;
}
