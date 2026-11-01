/**
 * Admin users. Password is stored as a salted PBKDF2 hash only.
 */
import { MongoModel } from "@dreamer/database";

export interface AdminUserDocument {
  _id?: string;
  username: string;
  /** PBKDF2 hash string, see common/service/password.ts */
  password: string;
  nickname: string;
  email?: string;
  /** Bound role codes (RBAC). */
  roleCodes: string[];
  status: "active" | "disabled";
  /** Google Authenticator (TOTP) secret, Base32. Set only while totpEnabled. */
  totpSecret?: string;
  /** Secret generated during setup, promoted to totpSecret once a code is verified. */
  totpPendingSecret?: string;
  totpEnabled?: boolean;
  /** Passkey (fingerprint) login switch; credentials live in admin_passkeys. */
  passkeyEnabled?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AdminUser extends MongoModel {
  static override collectionName = "admin_users";
  static override timestamps = true;
  static override indexes = [{ field: "username", unique: true }];
}
