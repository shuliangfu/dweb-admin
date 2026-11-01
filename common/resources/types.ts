/**
 * Shared shapes for the resource framework: one definition per list page drives
 * the server-side list/export/CRUD API and the client DataPanel (columns, search, forms).
 * Everything here is JSON-serializable except the server-only functions on ResourceDef.
 */
import type { Locale } from "@common/i18n/mod.ts";

export type L10n = { "zh-CN": string; "en-US": string };
export const l = (zh: string, en: string): L10n => ({ "zh-CN": zh, "en-US": en });
export const pick = (v: L10n | string, locale: Locale): string =>
  typeof v === "string" ? v : (v[locale] ?? v["zh-CN"]);

export type Tone = "success" | "warning" | "danger" | "info" | "default";
export interface Opt {
  value: string;
  label: L10n;
  tone?: Tone;
}

export type ColType = "text" | "number" | "money" | "datetime" | "tag" | "bool" | "image" | "link";

export interface ColDef {
  prop: string;
  label: L10n;
  type?: ColType;
  sortable?: boolean;
  width?: number;
  /** For `tag` columns: value → label/tone. */
  options?: Opt[];
  /** Inline edit (double click / direct toggle) through POST /api/res/field. */
  inline?: "switch" | "select" | "text" | "number";
  /** Show a sum of this column over the filtered rows in the footer. */
  total?: boolean;
  /** Hidden until switched on in the column menu. */
  hidden?: boolean;
  /** Not part of exports. */
  noExport?: boolean;
}

export interface SearchDef {
  name: string;
  label: L10n;
  type?: "text" | "select" | "date";
  options?: Opt[];
  /** How the server matches: regex (default for text), eq, num, from, to. */
  match?: "regex" | "eq" | "num" | "from" | "to";
  /** Model field when different from `name`. */
  field?: string;
}

export type FormType = "text" | "textarea" | "number" | "select" | "multiselect" | "switch" | "password" | "date" | "datetime";
export interface FormDef {
  name: string;
  label: L10n;
  type?: FormType;
  options?: Opt[];
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  placeholder?: L10n;
  /** Value on a new record. */
  initial?: string | number | boolean;
  /** Not editable once the record exists (e.g. username/code). */
  createOnly?: boolean;
  /** Only shown when editing. */
  editOnly?: boolean;
  /** For `switch`: the stored values [on, off]; default [true,false]. */
  onOff?: [string, string];
}

/** What the client needs to know about a resource. */
export interface ResourceMeta {
  key: string;
  title: string;
  columns: (Omit<ColDef, "label" | "options"> & { label: string; options?: { value: string; label: string; tone?: Tone }[] })[];
  search: (Omit<SearchDef, "label" | "options"> & { label: string; options?: { value: string; label: string }[] })[];
  form: (Omit<FormDef, "label" | "options" | "placeholder"> & {
    label: string;
    placeholder?: string;
    options?: { value: string; label: string }[];
  })[];
  caps: { create: boolean; update: boolean; view: boolean; remove: boolean; batchStatus: boolean; import: boolean; export: boolean };
  statusField?: string;
  statusValues?: { value: string; label: string }[];
  defaultSort?: { prop: string; order: "asc" | "desc" };
  /** Query keys fixed by the page (e.g. segment=active). */
  fixed?: Record<string, string>;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  sort: string;
  order: 1 | -1;
  /** Search field → raw string (only non-empty values). */
  filters: Record<string, string>;
}

export type Row = Record<string, unknown> & { id: string };
export interface ListResult {
  rows: Row[];
  total: number;
  totals?: Record<string, number>;
}
export type Fail = { ok: false; error: string; fields?: string[]; messages?: Record<string, string> };
export type Ok<T extends object = object> = { ok: true } & T;
export interface Ctx {
  request: Request;
  locale: Locale;
  userId: string;
  username: string;
}
export interface RemoveResult {
  removed: number;
  failed: { id: string; error: string }[];
}

export interface ResourceDef {
  key: string;
  title: L10n;
  /** Menu path of the page; used for RBAC (GET on the page also lets the user read the list). */
  path: string;
  columns: ColDef[];
  search: SearchDef[];
  form?: FormDef[];
  defaultSort?: { prop: string; order: "asc" | "desc" };
  pageSizes?: number[];
  statusField?: string;
  statusValues?: Opt[];
  /** Query keys fixed per page (merged into filters server-side). */
  fixed?: Record<string, string>;
  list(q: ListQuery, ctx: Ctx): Promise<ListResult>;
  view?: boolean;
  create?(body: Record<string, unknown>, ctx: Ctx): Promise<Ok | Fail>;
  update?(id: string, body: Record<string, unknown>, ctx: Ctx): Promise<Ok | Fail>;
  /** Single record for the edit/detail modal (defaults to the row from the list). */
  get?(id: string, ctx: Ctx): Promise<Row | null>;
  remove?(ids: string[], ctx: Ctx): Promise<RemoveResult>;
  /** Set one field on many rows (batch status / inline edit). */
  setField?(ids: string[], field: string, value: unknown, ctx: Ctx): Promise<RemoveResult>;
  /** Options that depend on the database (e.g. role list): form field name → options. */
  dynamicOptions?(ctx: Ctx): Promise<Record<string, { value: string; label: string }[]>>;
  /** Extra permission ("import") for CSV/JSON import. */
  importRows?(rows: Record<string, string>[], ctx: Ctx): Promise<{ created: number; failed: number }>;
}
