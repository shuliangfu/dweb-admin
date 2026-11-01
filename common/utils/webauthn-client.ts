/**
 * Browser-side WebAuthn glue: converts the JSON options produced by
 * @simplewebauthn/server into navigator.credentials calls and back into JSON.
 */
// deno-lint-ignore no-explicit-any
type Any = any;

const nav = (): Any => (globalThis as Any).navigator;

export function passkeySupported(): boolean {
  return !!(globalThis as Any).PublicKeyCredential && !!nav()?.credentials?.create;
}

function toBuf(s: string): ArrayBuffer {
  const p = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(p);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function toB64u(buf: ArrayBuffer | null | undefined): string | undefined {
  if (!buf) return undefined;
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Enrol: run navigator.credentials.create() and return a RegistrationResponseJSON. */
export async function createCredentialJSON(options: Any): Promise<Any> {
  const cred = await nav().credentials.create({
    publicKey: {
      ...options,
      challenge: toBuf(options.challenge),
      user: { ...options.user, id: toBuf(options.user.id) },
      excludeCredentials: (options.excludeCredentials ?? []).map((c: Any) => ({ ...c, id: toBuf(c.id) })),
    },
  });
  if (!cred) throw new Error("cancelled");
  const r = cred.response;
  return {
    id: cred.id,
    rawId: toB64u(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
    response: {
      clientDataJSON: toB64u(r.clientDataJSON),
      attestationObject: toB64u(r.attestationObject),
      transports: r.getTransports?.() ?? [],
    },
  };
}

/** Login: run navigator.credentials.get() and return an AuthenticationResponseJSON. */
export async function getAssertionJSON(options: Any): Promise<Any> {
  const cred = await nav().credentials.get({
    publicKey: {
      ...options,
      challenge: toBuf(options.challenge),
      allowCredentials: (options.allowCredentials ?? []).map((c: Any) => ({ ...c, id: toBuf(c.id) })),
    },
  });
  if (!cred) throw new Error("cancelled");
  const r = cred.response;
  return {
    id: cred.id,
    rawId: toB64u(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
    response: {
      clientDataJSON: toB64u(r.clientDataJSON),
      authenticatorData: toB64u(r.authenticatorData),
      signature: toB64u(r.signature),
      userHandle: toB64u(r.userHandle),
    },
  };
}
