/** Passkeys (WebAuthn credentials) and short-lived login/registration challenges. */
import { MongoModel } from "@dreamer/database";

export interface AdminPasskeyDocument {
  _id?: string;
  userId: string;
  /** Base64url credential id. */
  credentialId: string;
  /** Base64url COSE public key. */
  publicKey: string;
  counter: number;
  transports?: string[];
  name: string;
  lastUsedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AdminPasskey extends MongoModel {
  static override collectionName = "admin_passkeys";
  static override timestamps = true;
  static override indexes = [{ field: "credentialId", unique: true }, { field: "userId" }];
}

export type ChallengeKind = "2fa" | "passkey-reg" | "passkey-login";

/** One-shot challenge, keyed by SHA-256 of a random cookie token. */
export interface AdminChallengeDocument {
  _id?: string;
  kind: ChallengeKind;
  tokenHash: string;
  userId?: string;
  /** WebAuthn challenge (base64url). */
  challenge?: string;
  remember?: boolean;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AdminChallenge extends MongoModel {
  static override collectionName = "admin_challenges";
  static override timestamps = true;
  static override indexes = [{ field: "tokenHash", unique: true }, { field: "expiresAt" }];
}
