/**
 * Real, MongoDB-backed resources for the catalog "list" pages (members, CMS, developer, region).
 * Columns / search come from common/stubs/catalog.ts; every page gets persisted CRUD, server-side
 * list/sort/export and batch operations through the generic resource framework.
 */
import { MongoModel } from "@dreamer/database";
import { STUB_PAGES, type StubPage } from "@common/stubs/catalog.ts";
import { mongoResource } from "./mongo.ts";
import { type ColDef, type FormDef, type Opt, type ResourceDef, type SearchDef, l } from "./types.ts";

const NUM = new Set(["level", "visits", "images", "size"]);
const STATUS: Opt[] = [
  { value: "active", label: l("正常", "Active"), tone: "success" },
  { value: "pending", label: l("待处理", "Pending"), tone: "warning" },
  { value: "zombie", label: l("僵尸", "Zombie"), tone: "danger" },
  { value: "disabled", label: l("禁用", "Disabled"), tone: "default" },
];
const TIME = new Set(["createdAt", "created_at", "start", "end"]);

/** One Mongo collection per catalog key. */
export function stubModel(key: string): typeof MongoModel {
  const name = `stub_${key.replace(/\./g, "_")}`;
  return class extends MongoModel {
    static override collectionName = name;
    static override timestamps = true;
  } as unknown as typeof MongoModel;
}

/** Segment presets for the three member pages. */
const SEGMENT: Record<string, Record<string, unknown> | undefined> = {
  "user.active": { status: "active" },
  "user.zombie": { status: "zombie" },
};

export function stubResource(p: StubPage): ResourceDef {
  const columns: ColDef[] = p.columns.map((c): ColDef => {
    if (TIME.has(c.prop)) return { prop: "createdAt", label: c.label, type: "datetime", sortable: true };
    if (c.prop === "status") return { prop: c.prop, label: c.label, type: "tag", options: STATUS, sortable: true };
    if (NUM.has(c.prop)) return { prop: c.prop, label: c.label, type: "number", sortable: true };
    return { prop: c.prop, label: c.label, sortable: true };
  });

  const search: SearchDef[] = (p.searchFields?.length ? p.searchFields : [{ name: p.columns[0]?.prop ?? "name", label: p.columns[0]?.label ?? l("名称", "Name") }])
    .map((f): SearchDef => {
      if (f.name === "start") return { name: "start", label: f.label, type: "date", match: "from", field: "createdAt" };
      if (f.name === "end") return { name: "end", label: f.label, type: "date", match: "to", field: "createdAt" };
      if (f.name === "created_at") return { name: "created_at", label: f.label, type: "date", match: "from", field: "createdAt" };
      if (f.name === "status") return { name: "status", label: f.label, type: "select", options: STATUS };
      if (NUM.has(f.name)) return { name: f.name, label: f.label, match: "num" };
      return { name: f.name, label: f.label };
    });

  // Editable fields: every non-time column plus search-only fields that are real data (gid, pid, content …).
  const formNames = new Map<string, FormDef>();
  for (const c of p.columns) {
    if (TIME.has(c.prop)) continue;
    formNames.set(c.prop, {
      name: c.prop,
      label: c.label,
      type: c.prop === "status" ? "select" : NUM.has(c.prop) ? "number" : "text",
      options: c.prop === "status" ? STATUS : undefined,
      max: NUM.has(c.prop) ? undefined : 500,
      min: NUM.has(c.prop) ? 0 : undefined,
      required: c.prop === p.columns[0].prop,
      initial: c.prop === "status" ? (SEGMENT[p.key]?.status as string ?? "active") : NUM.has(c.prop) ? 0 : undefined,
    });
  }
  for (const f of p.searchFields ?? []) {
    if (formNames.has(f.name) || TIME.has(f.name)) continue;
    formNames.set(f.name, { name: f.name, label: f.label, type: f.name === "content" ? "textarea" : "text", max: 5000 });
  }

  return mongoResource({
    key: p.key,
    title: p.title,
    path: p.path,
    model: stubModel(p.key.startsWith("user.") ? "user.index" : p.key), // the three member pages share one collection
    columns,
    search,
    form: [...formNames.values()],
    defaultSort: { prop: "createdAt", order: "desc" },
    statusField: p.columns.some((c) => c.prop === "status") ? "status" : undefined,
    statusValues: STATUS,
    extraWhere: SEGMENT[p.key] ? () => SEGMENT[p.key]! : undefined,
  });
}

export const stubResources: ResourceDef[] = STUB_PAGES.filter((p) => p.kind === "list").map(stubResource);
