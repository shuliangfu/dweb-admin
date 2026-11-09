/**
 * Resource-list adapter: wires /api/res CRUD onto `@dreamer/ui-view` DataPanel.
 * Do not re-implement a second panel UI here — compose ui-view only.
 */
import {
  DataPanel as UiDataPanel,
  refreshDataPanel,
  type DataPanelColumn,
  type DataPanelDataSource,
  type DataPanelExportFormat,
  type DataPanelFormField,
  type DataPanelLocale,
  type DataPanelProps as UiDataPanelProps,
  type DataPanelQuery,
  type DataPanelRow,
  type DataPanelRowActionsConfig,
  type DataPanelSearchField,
  type DataPanelToolbarConfig,
  type DataPanelWriteResult,
} from "@dreamer/ui-view";
import type { Locale } from "@common/i18n/mod.ts";
import { api } from "@common/utils/client-api.ts";
import type { ListQuery, ResourceMeta, Row } from "@common/resources/types.ts";
import type { PanelInitial as ResPanelInitial } from "@common/resources/mod.ts";
import { CHROME_CAPS } from "@common/resources/chrome-caps.ts";

export type PanelInitial = ResPanelInitial;

export interface DataPanelProps {
  initial: PanelInitial;
  locale: Locale;
  /** Call-site toolbar overrides; show = caller ?? meta.caps / chrome. */
  toolbar?: DataPanelToolbarConfig;
  /** Call-site row action overrides (same level as toolbar). */
  rowActions?: DataPanelRowActionsConfig;
  renderCell?: Record<string, (row: Row) => unknown>;
  onChanged?: () => void;
  selectable?: boolean;
  onImportRows?: (rows: Record<string, string>[]) => void;
  children?: unknown;
}

/** Refresh the panel whose `panelKey` equals the resource key. */
export function refreshPanel(key: string): Promise<void> {
  return refreshDataPanel(key);
}

/** Tiny CSV parser (quotes, commas, newlines) → header-keyed rows. Kept for import helpers / docs. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  const [head, ...rest] = rows;
  if (!head) return [];
  return rest.map((r) =>
    Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()]))
  );
}

function listParams(
  q: DataPanelQuery,
  meta: ResourceMeta,
  forUrl: boolean,
): URLSearchParams {
  const p = new URLSearchParams();
  if (q.page > 1) p.set("page", String(q.page));
  const defSize = 10;
  if (!forUrl || q.pageSize !== defSize) p.set("pageSize", String(q.pageSize));
  const ds = meta.defaultSort;
  const orderLabel = q.order === -1 ? "desc" : "asc";
  const isDefault = (!q.sort && !ds) ||
    (ds && q.sort === ds.prop && orderLabel === ds.order);
  if (q.sort && (!forUrl || !isDefault)) {
    p.set("sort", q.sort);
    p.set("order", orderLabel);
  }
  for (const [k, v] of Object.entries(q.filters)) {
    if (v !== "" && !(meta.fixed && k in meta.fixed)) p.set(k, v);
  }
  if (!forUrl && meta.fixed) {
    for (const [k, v] of Object.entries(meta.fixed)) p.set(k, v);
  }
  return p;
}

function mapSearch(meta: ResourceMeta): DataPanelSearchField[] {
  return meta.search.map((s) => ({
    name: s.name,
    label: s.label,
    type: s.type,
    options: s.options,
    field: s.field,
    // Server still applies ResourceDef match; ui-view local match only used for `data` mode.
    match: s.match === "regex" || !s.match
      ? "contains"
      : (s.match as DataPanelSearchField["match"]),
  }));
}

function mapColumns(meta: ResourceMeta): DataPanelColumn[] {
  return meta.columns.map((c) => ({
    prop: c.prop,
    label: c.label,
    type: c.type,
    sortable: c.sortable,
    width: c.width,
    options: c.options,
    inline: c.inline,
    total: c.total,
    hidden: c.hidden,
    noExport: c.noExport,
  }));
}

function mapForm(meta: ResourceMeta): DataPanelFormField[] {
  return meta.form.map((f) => ({
    name: f.name,
    label: f.label,
    type: f.type,
    options: f.options,
    required: f.required,
    min: f.min,
    max: f.max,
    pattern: f.pattern,
    placeholder: f.placeholder,
    initial: f.initial,
    createOnly: f.createOnly,
    editOnly: f.editOnly,
    onOff: f.onOff,
  }));
}

function failWrite(
  r: Awaited<ReturnType<typeof api>>,
): DataPanelWriteResult {
  if (r.ok) return { ok: true };
  return {
    ok: false,
    message: r.data.message ?? r.data.error,
    fields: r.data.fields,
    messages: (r.data as { messages?: Record<string, string> }).messages,
  };
}

function makeDataSource(
  meta: ResourceMeta,
  props: DataPanelProps,
): DataPanelDataSource {
  const key = meta.key;
  const byLabel = () => new Map(meta.columns.map((c) => [c.label, c.prop]));

  return {
    async list(query) {
      const r = await api<{
        rows: Row[];
        total: number;
        totals?: Record<string, number>;
      }>(
        "GET",
        `/api/res?res=${encodeURIComponent(key)}&${listParams(query, meta, false)}`,
      );
      if (!r.ok) {
        return { rows: [], total: 0 };
      }
      return {
        rows: r.data.rows,
        total: r.data.total,
        totals: r.data.totals,
      };
    },
    ...(meta.caps.create
      ? {
        async create(values: Record<string, unknown>): Promise<DataPanelWriteResult> {
          const r = await api("POST", "/api/res/create", { res: key, ...values });
          return failWrite(r);
        },
      }
      : {}),
    ...(meta.caps.update
      ? {
        async update(
          id: string,
          values: Record<string, unknown>,
        ): Promise<DataPanelWriteResult> {
          const r = await api("POST", "/api/res/update", {
            res: key,
            id,
            ...values,
          });
          return failWrite(r);
        },
      }
      : {}),
    ...(meta.caps.remove
      ? {
        async remove(ids: string[]) {
          const r = await api<{
            removed: number;
            failed: { id: string; error: string }[];
          }>("POST", "/api/res/remove", { res: key, ids });
          if (r.status === 0) {
            return { removed: 0, failed: ids.map((id) => ({ id, error: "network" })) };
          }
          return {
            removed: r.data.removed ?? 0,
            failed: r.data.failed ?? [],
          };
        },
      }
      : {}),
    ...(meta.caps.batchStatus || meta.columns.some((c) => c.inline)
      ? {
        async setField(ids: string[], field: string, value: unknown) {
          const r = await api<{
            removed: number;
            failed: { id: string; error: string }[];
          }>("POST", "/api/res/field", { res: key, ids, field, value });
          if (r.status === 0) {
            return { removed: 0, failed: ids.map((id) => ({ id, error: "network" })) };
          }
          return {
            removed: r.data.removed ?? 0,
            failed: r.data.failed ?? [],
          };
        },
      }
      : {}),
    ...(meta.caps.import
      ? {
        async importRows(rows: Record<string, string>[]) {
          if (props.onImportRows) {
            props.onImportRows(rows);
            return { created: rows.length, failed: 0 };
          }
          const map = byLabel();
          const mapped = rows.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([k, v]) => [map.get(k) ?? k, v]),
            )
          );
          const r = await api<{ created: number; failed: number }>(
            "POST",
            "/api/res/importRows",
            { res: key, rows: mapped },
          );
          if (!r.ok) return { created: 0, failed: mapped.length };
          return { created: r.data.created ?? 0, failed: r.data.failed ?? 0 };
        },
      }
      : {}),
  };
}

export function DataPanel(props: DataPanelProps) {
  const meta = props.initial.meta;
  const locale = (props.locale === "en-US" ? "en-US" : "zh-CN") as DataPanelLocale;
  const dataSource = makeDataSource(meta, props);

  const onExport: UiDataPanelProps["onExport"] = meta.caps.export
    ? (format: DataPanelExportFormat, ctx) => {
      const cols = ctx.columns.filter((c) => !c.noExport).map((c) => c.prop)
        .join(",");
      const p = listParams(ctx.query, meta, false);
      p.delete("page");
      p.delete("pageSize");
      p.set("res", meta.key);
      p.set("format", format);
      p.set("cols", cols);
      const doc = (globalThis as { document?: Document }).document;
      if (!doc) return;
      const a = doc.createElement("a");
      a.href = `/api/res/download?${p}`;
      a.download = "";
      doc.body.appendChild(a);
      a.click();
      a.remove();
    }
    : undefined;

  return (
    <UiDataPanel
      panelKey={meta.key}
      title={meta.title}
      columns={mapColumns(meta)}
      search={mapSearch(meta)}
      form={mapForm(meta)}
      dataSource={dataSource}
      initial={{
        rows: props.initial.rows,
        total: props.initial.total,
        totals: props.initial.totals,
      }}
      initialQuery={{
        page: props.initial.query.page,
        pageSize: props.initial.query.pageSize,
        sort: props.initial.query.sort,
        order: props.initial.query.order,
        filters: props.initial.query.filters,
      }}
      statusField={meta.statusField}
      statusValues={meta.statusValues}
      defaultSort={meta.defaultSort}
      fixed={meta.fixed}
      caps={{
        // Auth caps baseline (SSR resolveResourceCaps). Call-site toolbar/rowActions override via show = caller ?? caps.
        create: meta.caps.create,
        update: meta.caps.update,
        view: meta.caps.view,
        remove: meta.caps.remove,
        batchStatus: meta.caps.batchStatus,
        import: meta.caps.import,
        export: meta.caps.export,
        // Chrome caps — NOT auth (always on for viewers unless toolbar.* overrides).
        ...CHROME_CAPS,
      }}
      toolbar={props.toolbar}
      rowActions={props.rowActions}
      locale={locale}
      syncUrl
      class="adm-data-panel adm-panel-card"
      selectable={props.selectable}
      renderCell={props.renderCell as
        | Record<string, (row: DataPanelRow) => unknown>
        | undefined}
      onChanged={props.onChanged}
      onImportRows={props.onImportRows}
      onExport={onExport}
      children={props.children}
    />
  );
}

export default DataPanel;
