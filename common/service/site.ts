/**
 * Sidebar brand from 基本设置. Defaults apply until a row is saved.
 */
import { SiteSetting } from "@common/model/mod.ts";
import type { Fail, Ok } from "@common/service/admin-crud.ts";

export const DEFAULT_WEBSITE = "Dweb 管理后台";
export const DEFAULT_SHORT = "DWEB";

export type SiteBrand = { website: string; shortName: string };

const KEY = "base";

export async function getSiteBrand(): Promise<SiteBrand> {
  const row = await SiteSetting.findOne({ key: KEY }) as { website?: string; shortName?: string } | null;
  const website = String(row?.website ?? "").trim();
  const shortName = String(row?.shortName ?? "").trim();
  return {
    website: website || DEFAULT_WEBSITE,
    shortName: shortName || DEFAULT_SHORT,
  };
}

export async function saveSiteBrand(website: string, shortName: string): Promise<Ok | Fail> {
  const w = website.trim();
  const s = shortName.trim();
  if (!w || w.length > 40 || !s || s.length > 12) return { ok: false, error: "invalid" };
  const row = await SiteSetting.findOne({ key: KEY }) as { _id?: string } | null;
  if (!row?._id) await SiteSetting.create({ key: KEY, website: w, shortName: s });
  else await SiteSetting.updateById(String(row._id), { website: w, shortName: s });
  return { ok: true };
}
