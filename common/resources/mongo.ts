/**
 * Generic Mongo-backed resource: list (search / sort / page / totals), validated create/update,
 * confirmed bulk remove and batch field updates. Used by every new entity page.
 */
import type { MongoModel } from "@dreamer/database";
import { t } from "@common/i18n/mod.ts";
import { escapeRe } from "@common/service/list.ts";
import type {
  ColDef,
  Ctx,
  Fail,
  FormDef,
  ListQuery,
  ListResult,
  Ok,
  RemoveResult,
  ResourceDef,
  Row,
  SearchDef,
} from "./types.ts";

// deno-lint-ignore no-explicit-any
type Doc = Record<string, any>;
type Model = typeof MongoModel;

export function docToRow(doc: Doc): Row {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === "_id") continue;
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  out.id = String(doc._id);
  return out as Row;
}

export function buildWhere(search: SearchDef[], filters: Record<string, string>): Record<string, unknown> {
  const and: Record<string, unknown>[] = [];
  for (const s of search) {
    const v = filters[s.name];
    if (v === undefined || v === "") continue;
    const field = s.field ?? s.name;
    const mode = s.match ?? (s.type === "select" ? "eq" : "regex");
    if (mode === "regex") and.push({ [field]: { $regex: escapeRe(v), $options: "i" } });
    else if (mode === "num") {
      const n = Number(v);
      if (Number.isFinite(n)) and.push({ [field]: n });
    } else if (mode === "from" || mode === "to") {
      const d = new Date(mode === "to" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T23:59:59.999` : v);
      if (!Number.isNaN(d.getTime())) and.push({ [field]: { [mode === "from" ? "$gte" : "$lte"]: d } });
    } else and.push({ [field]: v });
  }
  return and.length === 0 ? {} : and.length === 1 ? and[0] : { $and: and };
}

export interface MongoResourceOpts {
  key: string;
  title: ResourceDef["title"];
  path: string;
  model: Model;
  columns: ColDef[];
  search: SearchDef[];
  form?: FormDef[];
  defaultSort?: ResourceDef["defaultSort"];
  statusField?: string;
  statusValues?: ResourceDef["statusValues"];
  fixed?: Record<string, string>;
  view?: boolean;
  pageSizes?: number[];
  /** Extra where from page-level filters (e.g. a "segment" preset). */
  extraWhere?: (filters: Record<string, string>) => Record<string, unknown> | null;
  toRow?: (doc: Doc) => Row;
  /** Last chance to adjust / reject. Return an error code to refuse. */
  beforeCreate?: (data: Doc, ctx: Ctx) => Promise<string | null> | string | null;
  beforeUpdate?: (id: string, data: Doc, ctx: Ctx) => Promise<string | null> | string | null;
  canRemove?: (doc: Doc, ctx: Ctx) => Promise<string | null> | string | null;
  afterRemove?: (docs: Doc[], ctx: Ctx) => Promise<void> | void;
  noCreate?: boolean;
  noUpdate?: boolean;
  noRemove?: boolean;
  /** Fields that can be bulk/inline set (default: columns with `inline` + statusField). */
  settable?: string[];
}

/** Validate a form body against its FormDef list. */
export function validateForm(
  form: FormDef[],
  body: Record<string, unknown>,
  creating: boolean,
  ctx: Ctx,
): { data: Doc; fail?: Fail } {
  const data: Doc = {};
  const messages: Record<string, string> = {};
  for (const f of form) {
    if (f.createOnly && !creating) continue;
    if (f.editOnly && creating) continue;
    const type = f.type ?? "text";
    let v = body[f.name];
    if (type === "switch") {
      const [on, off] = f.onOff ?? ["true", "false"];
      const isOn = v === true || v === "true" || v === on || v === 1 || v === "1";
      data[f.name] = f.onOff ? (isOn ? on : off) : isOn;
      continue;
    }
    if (v === undefined || v === null) {
      if (!creating) continue; // partial update
      v = "";
    }
    if (type === "multiselect") {
      const arr = Array.isArray(v) ? v.map(String) : String(v).split(",").map((x) => x.trim()).filter(Boolean);
      if (f.required && arr.length === 0) messages[f.name] = t(ctx.locale, "form.required");
      else data[f.name] = arr;
      continue;
    }
    if (type === "number") {
      const s = String(v).trim();
      if (s === "") {
        if (f.required) messages[f.name] = t(ctx.locale, "form.required");
        else if (creating) data[f.name] = 0;
        continue;
      }
      const n = Number(s);
      if (!Number.isFinite(n)) {
        messages[f.name] = t(ctx.locale, "form.number");
        continue;
      }
      if (f.min !== undefined && n < f.min) messages[f.name] = t(ctx.locale, "form.min", { n: f.min });
      else if (f.max !== undefined && n > f.max) messages[f.name] = t(ctx.locale, "form.max", { n: f.max });
      else data[f.name] = n;
      continue;
    }
    const s = String(v).trim();
    if (s === "") {
      if (f.required) messages[f.name] = t(ctx.locale, "form.required");
      else data[f.name] = "";
      continue;
    }
    if (type !== "password" && f.min !== undefined && s.length < f.min) {
      messages[f.name] = t(ctx.locale, "form.minLen", { n: f.min });
    } else if (f.max !== undefined && s.length > f.max) {
      messages[f.name] = t(ctx.locale, "form.maxLen", { n: f.max });
    } else if (f.pattern && !new RegExp(f.pattern).test(s)) {
      messages[f.name] = t(ctx.locale, "form.pattern");
    } else if (type === "select" && f.options && !f.options.some((o) => o.value === s)) {
      messages[f.name] = t(ctx.locale, "form.option");
    } else if ((type === "date" || type === "datetime") && Number.isNaN(new Date(s).getTime())) {
      messages[f.name] = t(ctx.locale, "form.date");
    } else data[f.name] = type === "date" || type === "datetime" ? new Date(s) : s;
  }
  const fields = Object.keys(messages);
  if (fields.length) return { data, fail: { ok: false, error: "invalid", fields, messages } };
  return { data };
}

export function mongoResource(o: MongoResourceOpts): ResourceDef {
  const Model = o.model;
  const settable = new Set(o.settable ?? [...o.columns.filter((c) => c.inline).map((c) => c.prop), ...(o.statusField ? [o.statusField] : [])]);
  const toRow = o.toRow ?? docToRow;

  const whereOf = (filters: Record<string, string>) => {
    const base = buildWhere(o.search, filters);
    const extra = o.extraWhere?.(filters);
    if (!extra) return base;
    return Object.keys(base).length ? { $and: [base, extra] } : extra;
  };

  const def: ResourceDef = {
    key: o.key,
    title: o.title,
    path: o.path,
    columns: o.columns,
    search: o.search,
    form: o.form,
    defaultSort: o.defaultSort,
    statusField: o.statusField,
    statusValues: o.statusValues,
    fixed: o.fixed,
    pageSizes: o.pageSizes,
    view: o.view ?? true,
    async list(q: ListQuery): Promise<ListResult> {
      const where = whereOf(q.filters);
      const sort: Record<string, 1 | -1> = q.sort ? { [q.sort]: q.order } : { _id: -1 };
      if (q.sort) sort._id = -1;
      const r = await Model.paginate(where as never, q.page, q.pageSize, sort);
      const out: ListResult = {
        rows: (r.data as unknown as Doc[]).map(toRow),
        total: r.total,
      };
      const sums = o.columns.filter((c) => c.total);
      if (sums.length) {
        const group: Doc = { _id: null };
        for (const c of sums) group[c.prop] = { $sum: `$${c.prop}` };
        const agg = await Model.aggregate([{ $match: where }, { $group: group }]);
        out.totals = {};
        for (const c of sums) out.totals[c.prop] = Number(agg[0]?.[c.prop] ?? 0);
      }
      return out;
    },
    async get(id: string) {
      const doc = await Model.findOne({ _id: id } as never) as Doc | null;
      return doc ? toRow(doc) : null;
    },
  };

  if (!o.noCreate && o.form) {
    def.create = async (body, ctx): Promise<Ok | Fail> => {
      const { data, fail } = validateForm(o.form!, body, true, ctx);
      if (fail) return fail;
      const bad = await o.beforeCreate?.(data, ctx);
      if (bad) return { ok: false, error: bad, fields: [] };
      await Model.create(data as never);
      return { ok: true };
    };
  }
  if (!o.noUpdate && o.form) {
    def.update = async (id, body, ctx): Promise<Ok | Fail> => {
      const exists = await Model.findOne({ _id: id } as never);
      if (!exists) return { ok: false, error: "notFound" };
      const { data, fail } = validateForm(o.form!, body, false, ctx);
      if (fail) return fail;
      const bad = await o.beforeUpdate?.(id, data, ctx);
      if (bad) return { ok: false, error: bad, fields: [] };
      await Model.updateById(id, data);
      return { ok: true };
    };
  }
  if (!o.noRemove) {
    def.remove = async (ids, ctx): Promise<RemoveResult> => {
      const res: RemoveResult = { removed: 0, failed: [] };
      const done: Doc[] = [];
      for (const id of ids) {
        const doc = await Model.findOne({ _id: id } as never) as Doc | null;
        if (!doc) {
          res.failed.push({ id, error: "notFound" });
          continue;
        }
        const bad = await o.canRemove?.(doc, ctx);
        if (bad) {
          res.failed.push({ id, error: bad });
          continue;
        }
        await Model.deleteById(id);
        done.push(doc);
        res.removed++;
      }
      await o.afterRemove?.(done, ctx);
      return res;
    };
  }
  def.setField = async (ids, field, value, ctx): Promise<RemoveResult> => {
    const res: RemoveResult = { removed: 0, failed: [] };
    if (!settable.has(field) || o.noUpdate) {
      return { removed: 0, failed: ids.map((id) => ({ id, error: "invalid" })) };
    }
    const col = o.columns.find((c) => c.prop === field);
    const formDef = o.form?.find((f) => f.name === field);
    let v: unknown = value;
    if (col?.type === "number" || col?.type === "money" || formDef?.type === "number") v = Number(value);
    else if (formDef?.type === "switch" && !formDef.onOff) v = value === true || value === "true";
    else if (col?.type === "bool") v = value === true || value === "true";
    else v = String(value);
    if (typeof v === "number" && !Number.isFinite(v)) {
      return { removed: 0, failed: ids.map((id) => ({ id, error: "invalid" })) };
    }
    const allowed = col?.options?.map((x) => x.value) ?? o.statusValues?.map((x) => x.value);
    if (field === o.statusField && allowed && !allowed.includes(String(v))) {
      return { removed: 0, failed: ids.map((id) => ({ id, error: "invalid" })) };
    }
    for (const id of ids) {
      const bad = await o.beforeUpdate?.(id, { [field]: v }, ctx);
      if (bad) {
        res.failed.push({ id, error: bad });
        continue;
      }
      await Model.updateById(id, { [field]: v });
      res.removed++;
    }
    return res;
  };
  return def;
}
