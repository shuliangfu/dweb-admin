/**
 * Customer-service sessions and messages (Mongo via @dreamer/database).
 * Rooms on /ws use `cs:{sessionId}` — no market codes.
 */
import { MongoModel } from "@dreamer/database";

export type CsSessionStatus = "open" | "closed";

export interface CsSessionDocument {
  _id?: string;
  /** SHA-256 of the guest token handed to the browser; never log the raw token. */
  guestTokenHash: string;
  guestName: string;
  status: CsSessionStatus;
  lastMessageAt?: Date;
  lastPreview?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CsSession extends MongoModel {
  static override collectionName = "cs_sessions";
  static override timestamps = true;
  static override indexes = [
    { field: "guestTokenHash" },
    { field: "status" },
    { field: "lastMessageAt" },
  ];
}

export type CsFromRole = "admin" | "guest";

export interface CsMessageDocument {
  _id?: string;
  sessionId: string;
  fromId: string;
  fromName: string;
  fromRole: CsFromRole;
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CsMessage extends MongoModel {
  static override collectionName = "cs_messages";
  static override timestamps = true;
  static override indexes = [{ field: "sessionId" }];
}
