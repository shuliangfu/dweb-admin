/**
 * Chat session model — Mongo collection `chat_sessions`.
 * One collection ↔ one model file under common/models/.
 */
import { MongoModel } from "@dreamer/database";

export type ChatSessionStatus = "open" | "closed";

export interface ChatSessionDocument {
  _id?: string;
  /** SHA-256 of the guest token handed to the browser; never log the raw token. */
  guestTokenHash: string;
  guestName: string;
  status: ChatSessionStatus;
  lastMessageAt?: Date;
  lastPreview?: string;
  /**
   * When set, session is hidden from the admin lobby list.
   * Messages are kept. Cleared when the guest chats again (sendCsChat).
   * Online guests still appear in the lobby even with hiddenAt set.
   */
  hiddenAt?: Date | null;
  /**
   * Why hiddenAt was set. manual = admin hide (offline must stay out);
   * idle = auto-hide after ≥24h offline. Legacy rows may omit this — treat
   * non-manual hidden under 24h idle as stale auto and heal.
   */
  hideSource?: "manual" | "idle" | null;
  /** Guest currently connected on WS (persisted for admin list / soft poll). */
  guestOnline?: boolean;
  /**
   * Multi-agent claim (MVP). Empty / missing = 待认领.
   * claimedByAdminId = admin user id who claimed.
   */
  claimedByAdminId?: string | null;
  claimedByName?: string | null;
  claimedAt?: Date | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ChatSession extends MongoModel {
  static override collectionName = "chat_sessions";
  static override timestamps = true;
  static override indexes = [
    { field: "guestTokenHash" },
    { field: "status" },
    { field: "lastMessageAt" },
    { field: "claimedByAdminId" },
  ];
}

/** @deprecated Prefer ChatSession — kept for transitional imports. */
export { ChatSession as CsSession };
/** @deprecated Prefer ChatSessionDocument */
export type { ChatSessionDocument as CsSessionDocument };
/** @deprecated Prefer ChatSessionStatus */
export type { ChatSessionStatus as CsSessionStatus };
