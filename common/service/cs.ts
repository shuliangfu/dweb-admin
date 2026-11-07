/**
 * Customer-service chat: sessions, messages, room helpers.
 * WS rooms are `cs:{sessionId}`. Persistence is Mongo (CsSession / CsMessage).
 */
import {
  CsMessage,
  type CsMessageDocument,
  type CsFromRole,
  CsSession,
  type CsSessionDocument,
} from "@common/model/cs.ts";
import { randomToken, sha256 } from "@common/service/password.ts";

export const CS_ROOM_PREFIX = "cs:";
export const CS_MAX_TEXT = 500;
export const CS_MIN_SEND_GAP_MS = 400;

export interface CsChatView {
  id: string;
  fromName: string;
  fromRole: CsFromRole;
  fromId: string;
  text: string;
  time: string;
}

export interface CsSessionRow {
  id: string;
  guestName: string;
  status: string;
  lastPreview: string;
  updatedAt: string;
}

export function roomOf(sessionId: string): string {
  return `${CS_ROOM_PREFIX}${sessionId}`;
}

/** Parse `cs:{id}` → session id, or null when invalid. */
export function parseSessionId(room: string): string | null {
  if (!room.startsWith(CS_ROOM_PREFIX)) return null;
  const id = room.slice(CS_ROOM_PREFIX.length).trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null;
}

function asIso(d: Date | string | undefined): string {
  if (!d) return "";
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}

function mapMessage(row: CsMessageDocument): CsChatView {
  return {
    id: String(row._id ?? ""),
    fromName: row.fromName ?? "",
    fromRole: row.fromRole,
    fromId: row.fromId ?? "",
    text: row.text ?? "",
    time: asIso(row.createdAt),
  };
}

/** Open a guest session; returns raw guestToken once (client must store it). */
export async function createGuestSession(
  guestName?: string,
): Promise<{ sessionId: string; guestToken: string; guestName: string }> {
  const guestToken = randomToken(24);
  const name = (guestName ?? "").trim().slice(0, 32) || "访客";
  const row = await CsSession.create({
    guestTokenHash: await sha256(guestToken),
    guestName: name,
    status: "open",
    lastMessageAt: new Date(),
    lastPreview: "",
  }) as unknown as CsSessionDocument;
  return { sessionId: String(row._id), guestToken, guestName: name };
}

export async function guestFromToken(
  raw: string,
): Promise<{ sessionId: string; guestName: string } | null> {
  const token = (raw ?? "").trim();
  if (!token) return null;
  const row = await CsSession.findOne({
    guestTokenHash: await sha256(token),
  }) as CsSessionDocument | null;
  if (!row || row.status === "closed") return null;
  return { sessionId: String(row._id), guestName: row.guestName || "访客" };
}

export async function listCsSessions(limit = 80): Promise<CsSessionRow[]> {
  const rows = await CsSession.findAll(
    { status: "open" },
    undefined,
    { sort: { lastMessageAt: -1 }, limit },
  ) as unknown as CsSessionDocument[];
  return rows.map((r) => ({
    id: String(r._id),
    guestName: r.guestName || "访客",
    status: r.status,
    lastPreview: r.lastPreview ?? "",
    updatedAt: asIso(r.lastMessageAt ?? r.updatedAt),
  }));
}

export async function getCsDetail(sessionId: string): Promise<{
  session: CsSessionRow | null;
  messages: CsChatView[];
}> {
  const id = sessionId.trim();
  if (!id) return { session: null, messages: [] };
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row) return { session: null, messages: [] };
  const msgs = await CsMessage.findAll(
    { sessionId: id },
    undefined,
    { sort: { createdAt: 1 }, limit: 200 },
  ) as unknown as CsMessageDocument[];
  return {
    session: {
      id: String(row._id),
      guestName: row.guestName || "访客",
      status: row.status,
      lastPreview: row.lastPreview ?? "",
      updatedAt: asIso(row.lastMessageAt ?? row.updatedAt),
    },
    messages: msgs.map(mapMessage),
  };
}

export async function canJoinCsSession(
  kind: "admin" | "guest",
  sessionId: string,
  guestSessionId?: string,
): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row || row.status === "closed") return false;
  if (kind === "admin") return true;
  return guestSessionId === id;
}

export async function sendCsChat(
  from: { id: string; name: string; role: CsFromRole },
  sessionId: string,
  text: string,
): Promise<string | { message: CsChatView }> {
  const body = text.trim();
  if (!body || body.length > CS_MAX_TEXT) return "内容无效";
  const id = sessionId.trim();
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row || row.status === "closed") return "会话不存在";
  const created = await CsMessage.create({
    sessionId: id,
    fromId: from.id,
    fromName: from.name,
    fromRole: from.role,
    text: body,
  }) as unknown as CsMessageDocument;
  await CsSession.updateById(id, {
    lastMessageAt: new Date(),
    lastPreview: body.slice(0, 80),
  });
  return { message: mapMessage(created) };
}
