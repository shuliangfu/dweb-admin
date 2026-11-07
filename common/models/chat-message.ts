/**
 * Chat message model — Mongo collection `chat_messages`.
 * One collection ↔ one model file under common/models/.
 */
import { MongoModel } from "@dreamer/database";

export type ChatFromRole = "admin" | "guest";

/** Message kind. Missing/unknown → treat as text (compat with old rows). */
export type ChatMessageKind =
  | "text"
  | "emoji"
  | "image"
  | "file"
  | "voice"
  | "sticker";

export interface ChatMediaMeta {
  url: string;
  mime: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbUrl?: string;
}

export interface ChatMessageDocument {
  _id?: string;
  sessionId: string;
  fromId: string;
  fromName: string;
  fromRole: ChatFromRole;
  /** Plain text / caption / emoji / sticker glyph. Legacy rows always have this. */
  text: string;
  /** Optional; absent on legacy rows ⇒ text. */
  kind?: ChatMessageKind;
  media?: ChatMediaMeta;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ChatMessage extends MongoModel {
  static override collectionName = "chat_messages";
  static override timestamps = true;
  static override indexes = [{ field: "sessionId" }];
}

/** @deprecated Prefer ChatMessage */
export { ChatMessage as CsMessage };
/** @deprecated Prefer ChatMessageDocument */
export type { ChatMessageDocument as CsMessageDocument };
/** @deprecated Prefer ChatFromRole */
export type { ChatFromRole as CsFromRole };
/** @deprecated Prefer ChatMessageKind */
export type { ChatMessageKind as CsMessageKind };
/** @deprecated Prefer ChatMediaMeta */
export type { ChatMediaMeta as CsMediaMeta };
