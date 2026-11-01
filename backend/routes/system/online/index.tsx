/**
 * Online admins — active AdminSession rows + kick.
 * Menu removed from 系统管理 (OBSOLETE); route kept for model-backed access / RBAC grant.
 */
import type { LoadContext } from "@dreamer/dweb";
import { resolveLocale, type Locale } from "@common/i18n/mod.ts";
import { OnlineAdmin, type OnlineRow } from "@backend/components/OnlineAdmin.tsx";

export async function load(ctx: LoadContext) {
  const locale = resolveLocale(ctx.req);
  const { AdminSession } = await import("@common/model/mod.ts");
  const now = new Date();
  const sessions = (await AdminSession.findAll(
    { expiresAt: { $gt: now } } as never,
    undefined,
    { sort: { updatedAt: -1 }, limit: 100 },
  )) as unknown as Array<{
    _id: unknown;
    userId: string;
    username: string;
    ip?: string;
    userAgent?: string;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  const keywordRaw = new URL(ctx.req.url).searchParams.get("keyword") ?? "";
  const keyword = keywordRaw.trim().toLowerCase();
  let rows: OnlineRow[] = sessions.map((s) => ({
    id: String(s._id),
    username: s.username || "—",
    nickname: s.username || "—",
    ip: s.ip || "—",
    userAgent: s.userAgent || "—",
    updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString().slice(0, 19).replace("T", " ") : "—",
    expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString().slice(0, 19).replace("T", " ") : "—",
  }));
  if (keyword) rows = rows.filter((r) => r.username.toLowerCase().includes(keyword));
  return { locale, rows, keyword: keywordRaw };
}

type Data = { locale?: Locale; rows?: OnlineRow[]; keyword?: string };

export default function OnlinePage(props: { data?: Data }) {
  const d = props.data ?? {};
  return <OnlineAdmin locale={d.locale ?? "zh-CN"} rows={d.rows ?? []} keyword={d.keyword ?? ""} />;
}
