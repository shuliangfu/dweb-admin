/**
 * RBAC administration (Yii2 style): roles, permissions, routes.
 *
 *   Role       ⊇ roles, permissions, routes
 *   Permission ⊇ permissions, routes
 *
 * Child keys used by the API/UI: "role:<name>", "permission:<name>", "route:<METHOD path>".
 * Every write invalidates the RBAC cache. Super roles cannot be deleted, and
 * the last active super admin can never lose access (see admin-crud.ts).
 */
import { object, string } from "@dreamer/utils/validator";
import {
  AdminUser,
  type AdminUserDocument,
  AuthItem,
  AuthItemChild,
  type AuthItemChildDocument,
  type AuthItemDocument,
  AuthRoute,
  type AuthRouteDocument,
  type ChildType,
  type ItemType,
  parseRouteKey,
  routeKey,
  type RouteMethod,
} from "@common/model/mod.ts";
import { invalidateRbacCache, loadGraph, wouldCycle } from "@common/service/rbac.ts";
import { scanRoutes } from "@common/service/route-scan.ts";
import { parseBody } from "@common/utils/validate.ts";
import { type Fail, type Ok, type Page } from "@common/service/admin-crud.ts";
import { type Locale } from "@common/i18n/mod.ts";
import { itemDescription } from "@common/i18n/item-desc.ts";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ChildEntry {
  /** "role:x" | "permission:x" | "route:GET /p" */
  key: string;
  type: ChildType;
  /** Human label: item name, or "METHOD /path" for routes. */
  label: string;
}

const entry = (type: ChildType, child: string): ChildEntry => ({
  key: `${type}:${child}`,
  type,
  label: child,
});

// ------------------------------------------------------------------ items

const itemSchema = {
  description: string().optional().max(200),
  ruleName: string().optional().max(64),
  data: string().optional().max(500),
};

export type ItemListQuery = Page & {
  /** Vue role/access search schemas: name + info (description). */
  name?: string;
  info?: string;
};

export async function listItems(type: ItemType, q: ItemListQuery, locale: Locale) {
  const where: Record<string, unknown> = { type };
  const and: Record<string, unknown>[] = [];
  const nameQ = (q.name ?? "").trim().slice(0, 64);
  const infoQ = (q.info ?? "").trim().slice(0, 200);
  if (nameQ) and.push({ name: { $regex: escapeRe(nameQ), $options: "i" } });
  if (infoQ) and.push({ description: { $regex: escapeRe(infoQ), $options: "i" } });
  if (q.keyword) {
    and.push({
      $or: [
        { name: { $regex: escapeRe(q.keyword), $options: "i" } },
        { description: { $regex: escapeRe(q.keyword), $options: "i" } },
      ],
    });
  }
  if (and.length === 1) Object.assign(where, and[0]);
  else if (and.length > 1) where.$and = and;
  const r = await AuthItem.paginate(where as never, q.page, q.pageSize, { name: 1 });
  return {
    items: (r.data as unknown as AuthItemDocument[]).map((i) => ({
      name: i.name,
      type: i.type,
      description: itemDescription(i.name, i.description ?? "", locale),
      ruleName: i.ruleName ?? "",
      data: i.data ?? "",
      isSuper: !!i.isSuper,
      createdAt: i.createdAt ? new Date(i.createdAt).toISOString() : "",
      updatedAt: i.updatedAt ? new Date(i.updatedAt).toISOString() : "",
    })),
    total: r.total,
    page: r.page,
    pageSize: r.pageSize,
  };
}

/** All role names (for the admin-user role select). */
export async function roleOptions(locale: Locale) {
  const roles = (await AuthItem.findAll({ type: "role" }, undefined, { sort: { name: 1 } })) as unknown as AuthItemDocument[];
  return roles.map((r) => ({ name: r.name, description: itemDescription(r.name, r.description ?? "", locale) }));
}

export async function createItem(type: ItemType, body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(
    body,
    object({ name: string().required().min(2).max(64).pattern(/^[^\s/]+$/), ...itemSchema }),
  );
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const d = parsed.data as Record<string, string | undefined>;
  if (await AuthItem.findOne({ name: d.name! })) return { ok: false, error: "itemExists", fields: ["name"] };
  // isSuper is only ever set by the seed / database, never through the API.
  await AuthItem.create({
    name: d.name,
    type,
    description: d.description ?? "",
    ruleName: d.ruleName ?? "",
    data: d.data ?? "",
    isSuper: false,
  });
  await invalidateRbacCache();
  return { ok: true };
}

export async function updateItem(type: ItemType, name: string, body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(body, object({ ...itemSchema }));
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const item = await AuthItem.findOne({ name, type }) as AuthItemDocument | null;
  if (!item) return { ok: false, error: "notFound" };
  const d = parsed.data as Record<string, string | undefined>;
  const patch: Record<string, unknown> = {};
  for (const f of ["description", "ruleName", "data"] as const) if (d[f] !== undefined) patch[f] = d[f];
  if (Object.keys(patch).length) await AuthItem.updateById(String(item._id), patch);
  await invalidateRbacCache();
  return { ok: true };
}

export async function deleteItem(type: ItemType, name: string): Promise<Ok | Fail> {
  const item = await AuthItem.findOne({ name, type }) as AuthItemDocument | null;
  if (!item) return { ok: false, error: "notFound" };
  if (item.isSuper) return { ok: false, error: "lastSuperAdmin" };
  if (type === "role") {
    const users = (await AdminUser.findAll({})) as unknown as AdminUserDocument[];
    if (users.some((u) => (u.roleCodes ?? []).includes(name))) return { ok: false, error: "roleInUse" };
  }
  await AuthItemChild.deleteMany({ parent: name });
  await AuthItemChild.deleteMany({ child: name, childType: type });
  await AuthItem.deleteById(String(item._id));
  await invalidateRbacCache();
  return { ok: true };
}

// ------------------------------------------------------- hierarchy (Transfer)

/**
 * Detail + both Transfer lists for an item.
 * assigned  = current direct children
 * available = everything that may still be added (no self, no cycles, managed routes only)
 */
export async function itemDetail(type: ItemType, name: string, locale: Locale) {
  const item = await AuthItem.findOne({ name, type }) as AuthItemDocument | null;
  if (!item) return null;
  const kids = (await AuthItemChild.findAll({ parent: name })) as unknown as AuthItemChildDocument[];
  const assigned = kids.map((k) => entry(k.childType, k.child));
  const have = new Set(assigned.map((e) => e.key));
  const graph = await loadGraph();
  const items = (await AuthItem.findAll({}, undefined, { sort: { name: 1 } })) as unknown as AuthItemDocument[];
  const available: ChildEntry[] = [];
  for (const i of items) {
    if (i.name === name) continue;
    // a permission can only hold permissions + routes
    if (type === "permission" && i.type === "role") continue;
    const e = entry(i.type as ChildType, i.name);
    if (have.has(e.key) || wouldCycle(graph, name, i.name)) continue;
    available.push(e);
  }
  const routes = (await AuthRoute.findAll({}, undefined, { sort: { path: 1 } })) as unknown as AuthRouteDocument[];
  for (const r of routes) {
    const e = entry("route", routeKey(r.method, r.path));
    if (!have.has(e.key)) available.push(e);
  }
  return {
    item: {
      name: item.name,
      type: item.type,
      description: item.description ?? "",
      displayDescription: itemDescription(item.name, item.description ?? "", locale),
      ruleName: item.ruleName ?? "",
      data: item.data ?? "",
      isSuper: !!item.isSuper,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : "",
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : "",
    },
    assigned,
    available,
  };
}

function splitKey(key: string): { type: ChildType; child: string } | null {
  const i = key.indexOf(":");
  const type = key.slice(0, i);
  if (!["role", "permission", "route"].includes(type)) return null;
  return { type: type as ChildType, child: key.slice(i + 1) };
}

/** Transfer >> (add) and << (remove). Validates types, cycles and managed routes. */
export async function changeChildren(
  type: ItemType,
  name: string,
  add: string[],
  remove: string[],
): Promise<Ok | Fail> {
  const item = await AuthItem.findOne({ name, type }) as AuthItemDocument | null;
  if (!item) return { ok: false, error: "notFound" };
  const graph = await loadGraph();
  const managed = new Set(
    ((await AuthRoute.findAll({})) as unknown as AuthRouteDocument[]).map((r) => routeKey(r.method, r.path)),
  );
  const toAdd: { type: ChildType; child: string }[] = [];
  for (const k of add) {
    const c = splitKey(k);
    if (!c) return { ok: false, error: "invalid" };
    if (c.type === "route") {
      if (!parseRouteKey(c.child)) return { ok: false, error: "routeInvalid" };
      if (!managed.has(c.child)) return { ok: false, error: "routeNotManaged" };
    } else {
      const meta = graph.items[c.child];
      if (!meta || meta.type !== c.type) return { ok: false, error: "notFound" };
      if (type === "permission" && c.type === "role") return { ok: false, error: "invalid" };
      if (wouldCycle(graph, name, c.child)) return { ok: false, error: "cycle" };
    }
    toAdd.push(c);
  }
  for (const c of toAdd) {
    if (!await AuthItemChild.findOne({ parent: name, childType: c.type, child: c.child })) {
      await AuthItemChild.create({ parent: name, childType: c.type, child: c.child });
    }
  }
  for (const k of remove) {
    const c = splitKey(k);
    if (!c) return { ok: false, error: "invalid" };
    await AuthItemChild.deleteMany({ parent: name, childType: c.type, child: c.child });
  }
  await invalidateRbacCache();
  return { ok: true };
}

// ----------------------------------------------------------------- routes

/** Managed routes + scanned routes that are not managed yet. */
export async function listRoutes() {
  const managedRows = (await AuthRoute.findAll({}, undefined, { sort: { path: 1 } })) as unknown as AuthRouteDocument[];
  const managed = managedRows.map((r) => routeKey(r.method, r.path));
  const have = new Set(managed);
  const available = (await scanRoutes())
    .map((r) => routeKey(r.method, r.path))
    .filter((k) => !have.has(k));
  /** Vue route list columns that exist on AuthRoute (no separate route `name`). */
  const managedDetail = managedRows.map((r) => ({
    key: routeKey(r.method, r.path),
    method: r.method,
    path: r.path,
    source: r.source,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
  }));
  return { managed, available, managedDetail };
}

/** Parse "GET /a, /b\nPOST /c" — method optional (defaults to "*"). */
export function parseRouteInput(text: string): string[] | null {
  const keys: string[] = [];
  for (const part of text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(?:(GET|POST|PUT|PATCH|DELETE|\*)\s+)?(\/\S*)$/i);
    if (!m) return null;
    keys.push(routeKey((m[1] ?? "*").toUpperCase(), m[2]));
  }
  return keys.length ? keys : null;
}

/** Add routes to the managed set (manual add, or Transfer >>). */
export async function addRoutes(keys: string[], source: "manual" | "scan"): Promise<Ok | Fail> {
  const parsed: { method: RouteMethod; path: string }[] = [];
  for (const k of keys) {
    const r = parseRouteKey(k);
    if (!r) return { ok: false, error: "routeInvalid" };
    parsed.push(r);
  }
  for (const r of parsed) {
    if (!await AuthRoute.findOne({ method: r.method, path: r.path })) await AuthRoute.create({ ...r, source });
  }
  await invalidateRbacCache();
  return { ok: true };
}

/** Un-manage routes (Transfer <<): also strips them from every role/permission. */
export async function removeRoutes(keys: string[]): Promise<Ok | Fail> {
  for (const k of keys) {
    const r = parseRouteKey(k);
    if (!r) return { ok: false, error: "routeInvalid" };
    await AuthRoute.deleteMany({ method: r.method, path: r.path });
    await AuthItemChild.deleteMany({ childType: "route", child: k });
  }
  await invalidateRbacCache();
  return { ok: true };
}
