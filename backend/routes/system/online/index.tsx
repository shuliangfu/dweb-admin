/**
 * Online admins — list active AdminSession rows (minimal system page).
 */
import type { LoadContext } from "@dreamer/dweb";
import { resolveLocale, type Locale } from "@common/i18n/mod.ts";
import { OnlineAdmin } from "@backend/components/OnlineAdmin.tsx";

export async function load(ctx: LoadContext) {
  const locale = resolveLocale(ctx.req);
  const { AdminSession } = await import("@common/model/mod.ts");
  const now = new Date();
  const sessions = await AdminSession.find({
    expiresAt: { $gt: now },
  }).sort({ updatedAt: -1 }).limit(100).findAll() as unknown as Array<{
    _id: unknown;
    userId: string;
    username: string;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  const keyword = (new URL(ctx.req.url).searchParams.get("keyword") ?? "").trim().toLowerCase();
  let rows = sessions.map((s) => ({
    id: String(s._id),
    username: s.username || "—",
    nickname: s.username || "—",
    ip: "—",
    userAgent: "—",
    updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : "—",
    expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : "—",
  }));
  if (keyword) rows = rows.filter((r) => r.username.toLowerCase().includes(keyword));
  return { locale, rows };
}

type Data = { locale?: Locale; rows?: Array<Record<string, string>> };

export default function OnlinePage(props: { data?: Data }) {
  const d = props.data ?? {};
  return <OnlineAdmin locale={d.locale ?? "zh-CN"} rows={(d.rows ?? []) as never} />;
}
