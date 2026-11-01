/** URL → ListQuery for the resource API and the SSR page loads. */
import type { ListQuery, ResourceDef } from "@common/resources/types.ts";

export const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];
export const EXPORT_LIMIT = 50000;

export function parseListQuery(params: URLSearchParams, def: ResourceDef): ListQuery {
  const sizes = def.pageSizes ?? DEFAULT_PAGE_SIZES;
  const int = (k: string, d: number) => {
    const v = Number.parseInt(params.get(k) ?? "", 10);
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  const page = Math.min(int("page", 1), 1_000_000);
  const reqSize = int("pageSize", sizes[0]);
  const pageSize = sizes.includes(reqSize) ? reqSize : sizes[0];
  const sortable = new Set(def.columns.filter((c) => c.sortable).map((c) => c.prop));
  let sort = params.get("sort") ?? "";
  let order: 1 | -1 = params.get("order") === "desc" ? -1 : 1;
  if (!sortable.has(sort)) {
    sort = def.defaultSort?.prop ?? "";
    order = def.defaultSort?.order === "desc" ? -1 : 1;
  }
  const filters: Record<string, string> = {};
  for (const s of def.search) {
    const v = (params.get(s.name) ?? "").trim().slice(0, 128);
    if (v) filters[s.name] = v;
  }
  for (const [k, v] of Object.entries(def.fixed ?? {})) filters[k] = v;
  return { page, pageSize, sort, order, filters };
}

/** Same query, but every matching row (exports). */
export function allRows(q: ListQuery): ListQuery {
  return { ...q, page: 1, pageSize: EXPORT_LIMIT };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export { escapeRe };
