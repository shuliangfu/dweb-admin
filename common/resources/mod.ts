/** Resource registry + helpers shared by the API routes and page loaders. */
import type { Locale } from "@common/i18n/mod.ts";
import { parseListQuery } from "@common/service/list.ts";
import {
  adminsResource,
  assignResource,
  menusResource,
  onlineResource,
  permissionsResource,
  rolesResource,
  routesResource,
} from "./system.ts";
import { stubResources } from "./stubs.ts";
import { type ListResult, type ResourceDef, type ResourceMeta, pick, type ListQuery } from "./types.ts";
import { resolveResourceCaps, staticAuthCaps } from "./caps.ts";
export { resolveResourceCaps, staticAuthCaps, CHROME_CAPS, trimCapsForWrite } from "./caps.ts";

const defs: ResourceDef[] = [
  adminsResource,
  assignResource,
  rolesResource,
  permissionsResource,
  routesResource,
  menusResource,
  onlineResource,
  ...stubResources,
];

const registry = new Map<string, ResourceDef>(defs.map((d) => [d.key, d]));

export function registerResource(def: ResourceDef): void {
  registry.set(def.key, def);
}
export function getResource(key: string): ResourceDef | undefined {
  return registry.get(key);
}
export function allResources(): ResourceDef[] {
  return [...registry.values()];
}

/** Locale-resolved description of a resource for the client. */
export function resourceMeta(
  def: ResourceDef,
  locale: Locale,
  dyn: Record<string, { value: string; label: string }[]> = {},
): ResourceMeta {
  return {
    key: def.key,
    title: pick(def.title, locale),
    columns: def.columns.map((c) => ({
      ...c,
      label: pick(c.label, locale),
      options: c.options?.map((o) => ({ value: o.value, label: pick(o.label, locale), tone: o.tone })),
    })),
    search: def.search.map((s) => ({
      ...s,
      label: pick(s.label, locale),
      options: dyn[s.name] ?? s.options?.map((o) => ({ value: o.value, label: pick(o.label, locale) })),
    })),
    form: (def.form ?? []).map((f) => ({
      ...f,
      label: pick(f.label, locale),
      placeholder: f.placeholder ? pick(f.placeholder, locale) : undefined,
      options: dyn[f.name] ?? f.options?.map((o) => ({ value: o.value, label: pick(o.label, locale) })),
    })),
    caps: staticAuthCaps(def),
    statusField: def.statusField,
    statusValues: def.statusValues?.map((o) => ({ value: o.value, label: pick(o.label, locale) })),
    defaultSort: def.defaultSort,
    fixed: def.fixed,
  };
}

/** Everything a page needs for its first (server-rendered) paint. */
export interface PanelInitial {
  meta: ResourceMeta;
  query: ListQuery;
  rows: ListResult["rows"];
  total: number;
  totals?: Record<string, number>;
}

export async function loadPanel(
  key: string,
  req: Request,
  locale: Locale,
  user: { id: string; username: string; roleCodes?: string[]; isSuper?: boolean },
): Promise<PanelInitial> {
  const def = getResource(key);
  if (!def) throw new Error(`Unknown resource: ${key}`);
  const query = parseListQuery(new URL(req.url).searchParams, def);
  let r: ListResult = { rows: [], total: 0 };
  const ctx = { request: req, locale, userId: user.id, username: user.username };
  try {
    r = await def.list(query, ctx);
  } catch (e) {
    console.error(`[res:${key}] list failed`, e);
  }
  const dyn = def.dynamicOptions ? await def.dynamicOptions(ctx).catch(() => ({})) : {};
  const meta = resourceMeta(def, locale, dyn);
  // me → resolveResourceCaps → meta.caps → DataPanel buttons (auth only; chrome separate)
  meta.caps = await resolveResourceCaps(
    { roleCodes: user.roleCodes ?? [], isSuper: !!user.isSuper },
    def,
  );
  return { meta, query, rows: r.rows, total: r.total, totals: r.totals };
}
