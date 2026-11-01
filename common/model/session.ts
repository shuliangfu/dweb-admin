/**
 * Login sessions. The cookie carries the raw token; the DB stores only its SHA-256.
 */
import { MongoModel } from "@dreamer/database";

export interface AdminSessionDocument {
  _id?: string;
  userId: string;
  username: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AdminSession extends MongoModel {
  static override collectionName = "admin_sessions";
  static override timestamps = true;
  static override indexes = [{ field: "tokenHash", unique: true }, {
    field: "expiresAt",
  }];
}
