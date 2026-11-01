/**
 * DataPanel — the one list "数据面板" used by every admin page (Vue CardPanel parity and beyond).
 *
 * Server-driven: rows, total, totals come from /api/res (server-side paging / sort / search),
 * the query lives in the URL (page, pageSize, sort, order + filters, via history.replaceState).
 * Features: tabs-free toolbar (create / search / refresh / print / import / export / columns),
 * loading overlay, sortable headers, multi-select with batch delete + batch status, inline edit,
 * totals row, page-size switch + jump, Modal create/edit/view forms (Enter submits, field-level
 * server errors) and a mandatory confirmation dialog before ANY delete.
 */
import { createSignal, onMount, type JSXRenderable } from "@dreamer/view";
import {
  Button,
  ButtonGroup,
  Card,
  Descriptions,
  Dropdown,
  FormItem,
  IconChevronDown,
  IconChevronUp,
  IconColumns,
  IconDownload,
  IconEdit,
  IconEye,
  IconList,
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
  Input,
  Modal,
  Textarea,
  message,
} from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api } from "@common/utils/client-api.ts";
import { displayValue, fmtDateTime, fmtMoney } from "@common/resources/display.ts";
import type { ListQuery, ResourceMeta, Row, Tone } from "@common/resources/types.ts";

export interface PanelInitial {
  meta: ResourceMeta;
  query: ListQuery;
  rows: Row[];
  total: number;
  totals?: Record<string, number>;
}

export interface DataPanelProps {
  initial: PanelInitial;
  locale: Locale;
  /** Override the generic create/edit/view Modals (pages with bespoke forms). */
  onCreate?: () => void;
  onEdit?: (row: Row) => void;
  onView?: (row: Row) => void;
  /** Custom cell renderers by column prop. */
  renderCell?: Record<string, (row: Row) => unknown>;
  /** Extra per-row buttons (rendered before the standard actions). */
  rowExtra?: (row: Row) => unknown;
  toolbarExtra?: unknown;
  /** Called after any successful write so pages can refresh siblings. */
  onChanged?: () => void;
  /** Disable the selection column / batch bar (e.g. read-only lists). */
  selectable?: boolean;
  /** Called with parsed CSV/JSON rows when the resource has no import API. */
  onImportRows?: (rows: Record<string, string>[]) => void;
  /** Extra modals / content rendered inside the panel root. */
  children?: unknown;
}

// ---------------------------------------------------------------- refresh registry
const refreshers = new Map<string, () => Promise<void>>();
/** Re-fetch the current page of a panel (pages call this after their own modal saves). */
export function refreshPanel(key: string): Promise<void> {
  return refreshers.get(key)?.() ?? Promise.resolve();
}

// ---------------------------------------------------------------- helpers
interface PrintWin {
  document: { write(s: string): void; close(): void };
  focus(): void;
  print(): void;
}
const g = globalThis as unknown as {
  location?: { pathname: string; search: string };
  history?: { replaceState: (a: unknown, b: string, c: string) => void };
  // deno-lint-ignore no-explicit-any
  document?: any;
  localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
  open?: (u?: string, t?: string) => PrintWin | null;
};

const TONE: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  default: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function listParams(q: ListQuery, meta: ResourceMeta, forUrl: boolean): URLSearchParams {
  const p = new URLSearchParams();
  if (q.page > 1) p.set("page", String(q.page));
  const defSize = meta.search ? 10 : 10;
  if (!forUrl || q.pageSize !== defSize) p.set("pageSize", String(q.pageSize));
  const ds = meta.defaultSort;
  const isDefault = (!q.sort && !ds) || (ds && q.sort === ds.prop && (q.order === 1 ? "asc" : "desc") === ds.order);
  if (q.sort && (!forUrl || !isDefault)) {
    p.set("sort", q.sort);
    p.set("order", q.order === -1 ? "desc" : "asc");
  }
  for (const [k, v] of Object.entries(q.filters)) {
    if (v !== "" && !(meta.fixed && k in meta.fixed)) p.set(k, v);
  }
  if (!forUrl && meta.fixed) for (const [k, v] of Object.entries(meta.fixed)) p.set(k, v);
  return p;
}

/** Tiny CSV parser (quotes, commas, newlines) → header-keyed rows. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  const [head, ...rest] = rows;
  if (!head) return [];
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

function pageList(cur: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const s = new Set([1, 2, last - 1, last, cur - 1, cur, cur + 1]);
  const arr = [...s].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  arr.forEach((n, i) => {
    if (i && n - arr[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const SELECT_CLS =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900";
const ICON_BTN = "!bg-transparent !border-0 !shadow-none px-1 py-1";

// ---------------------------------------------------------------- component
export function DataPanel(props: DataPanelProps): JSXRenderable {
  const { initial, locale } = props;
  const meta = initial.meta;
  const tr = createT(locale);
  const key = meta.key;
  const selectable = props.selectable !== false && (meta.caps.remove || meta.caps.batchStatus);

  const rows = createSignal<Row[]>(initial.rows);
  const total = createSignal(initial.total);
  const totals = createSignal<Record<string, number>>(initial.totals ?? {});
  const query = createSignal<ListQuery>(initial.query);
  const loading = createSignal(false);
  const selected = createSignal<string[]>([]);
  const hidden = createSignal<Record<string, boolean>>(
    Object.fromEntries(meta.columns.filter((c) => c.hidden).map((c) => [c.prop, true])),
  );
  const showSearch = createSignal(Object.keys(initial.query.filters).some((k) => !(meta.fixed && k in meta.fixed)));
  const draft = createSignal<Record<string, string>>({ ...initial.query.filters });
  const jump = createSignal("");
  let seq = 0;

  // ---- data loading
  async function load(syncUrl = true): Promise<void> {
    const my = ++seq;
    loading.value = true;
    const q = query.value;
    const r = await api<{ rows: Row[]; total: number; totals?: Record<string, number> }>(
      "GET",
      `/api/res?res=${encodeURIComponent(key)}&${listParams(q, meta, false)}`,
    );
    if (my !== seq) return;
    loading.value = false;
    if (!r.ok) {
      message.error(r.status === 0 ? tr("crud.networkError") : (r.data.message ?? tr("crud.networkError")));
      return;
    }
    const last = Math.max(1, Math.ceil(r.data.total / q.pageSize));
    if (q.page > last) {
      query.value = { ...q, page: last };
      return load(syncUrl);
    }
    rows.value = r.data.rows;
    total.value = r.data.total;
    totals.value = r.data.totals ?? {};
    selected.value = [];
    if (syncUrl && g.history && g.location) {
      const qs = listParams(q, meta, true).toString();
      g.history.replaceState(null, "", g.location.pathname + (qs ? `?${qs}` : ""));
    }
  }
  refreshers.set(key, () => load(false));

  function setQuery(patch: Partial<ListQuery>): void {
    query.value = { ...query.value, ...patch };
    void load();
  }

  function columnsVisible() {
    return meta.columns.filter((c) => !hidden.value[c.prop]);
  }

  // ---- column prefs
  onMount(() => {
    try {
      const raw = g.localStorage?.getItem(`dp-cols-${key}`);
      if (raw) hidden.value = JSON.parse(raw);
    } catch { /* ignore */ }
  });
  function saveHidden(next: Record<string, boolean>): void {
    hidden.value = next;
    try {
      g.localStorage?.setItem(`dp-cols-${key}`, JSON.stringify(next));
    } catch { /* ignore */ }
  }

  // ---- confirm dialog (all deletes / batch status go through it)
  type Confirm = {
    title: string;
    text: string;
    danger?: boolean;
    okText: string;
    run: () => Promise<void>;
  };
  const confirm = createSignal<Confirm | null>(null);
  const confirmBusy = createSignal(false);

  const rowName = (r: Row): string => {
    const c = meta.columns[0];
    return String(r[c?.prop ?? "id"] ?? r.name ?? r.username ?? r.id);
  };

  function reportBulk(res: { removed?: number; failed?: { id: string; error: string }[] }, okText: string): void {
    const failed = res.failed ?? [];
    if (!failed.length) {
      message.success(okText);
      return;
    }
    const reason = tr(`apiError.${failed[0].error}`);
    if ((res.removed ?? 0) > 0) {
      message.warning(tr("panel.partial", { ok: res.removed ?? 0, fail: failed.length, reason }));
    } else message.error(reason);
  }

  function askDelete(ids: string[], label: string): void {
    confirm.value = {
      title: tr("crud.deleteTitle"),
      text: ids.length === 1 ? tr("crud.deleteAsk", { name: label }) : tr("panel.deleteMany", { n: ids.length }),
      danger: true,
      okText: tr("crud.delete"),
      run: async () => {
        const r = await api<{ removed: number; failed: { id: string; error: string }[] }>("POST", "/api/res/remove", { res: key, ids });
        if (r.status === 0) message.error(tr("crud.networkError"));
        else if (r.status === 401 || r.status === 403) message.error(r.data.message ?? tr("error.forbidden"));
        else reportBulk(r.data, tr("crud.deleted"));
        await load(false);
        props.onChanged?.();
      },
    };
  }

  function askStatus(ids: string[], value: string, label: string): void {
    confirm.value = {
      title: tr("panel.batchConfirmTitle"),
      text: tr("panel.batchStatusAsk", { n: ids.length, status: label }),
      okText: tr("crud.confirm"),
      run: async () => {
        const r = await api<{ removed: number; failed: { id: string; error: string }[] }>("POST", "/api/res/field", {
          res: key,
          ids,
          field: meta.statusField,
          value,
        });
        if (r.status === 0) message.error(tr("crud.networkError"));
        else reportBulk(r.data, tr("crud.saved"));
        await load(false);
        props.onChanged?.();
      },
    };
  }

  // ---- inline edit
  const editing = createSignal<{ id: string; prop: string } | null>(null);
  async function setField(row: Row, prop: string, value: unknown): Promise<void> {
    const r = await api<{ removed: number; failed: { id: string; error: string }[] }>("POST", "/api/res/field", {
      res: key,
      ids: [row.id],
      field: prop,
      value,
    });
    if (r.status === 0) message.error(tr("crud.networkError"));
    else if (r.data.failed?.length) message.error(tr(`apiError.${r.data.failed[0].error}`));
    else {
      message.success(tr("crud.saved"));
      props.onChanged?.();
    }
    await load(false);
  }

  // ---- generic form modal
  const formOpen = createSignal(false);
  const formId = createSignal("");
  const formBusy = createSignal(false);
  const formErrors = createSignal<Record<string, string>>({});
  const formTop = createSignal("");
  const fields: Record<string, ReturnType<typeof createSignal<string>>> = {};
  for (const f of meta.form) fields[f.name] = createSignal("");

  function openForm(row?: Row): void {
    formId.value = row?.id ?? "";
    for (const f of meta.form) {
      const raw = row ? row[f.name] : undefined;
      let v: string;
      if (raw === undefined || raw === null) v = row ? "" : String(f.initial ?? (f.type === "switch" ? (f.onOff ? f.onOff[0] : "true") : ""));
      else if (f.type === "datetime" || f.type === "date") {
        const s = fmtDateTime(raw);
        v = f.type === "date" ? s.slice(0, 10) : s.replace(" ", "T").slice(0, 16);
      } else if (f.type === "switch") v = f.onOff ? String(raw) : (raw ? "true" : "false");
      else v = String(raw);
      if (f.type === "password") v = "";
      fields[f.name].value = v;
    }
    formErrors.value = {};
    formTop.value = "";
    formOpen.value = true;
  }

  async function submitForm(): Promise<void> {
    if (formBusy.value) return;
    formBusy.value = true;
    formErrors.value = {};
    formTop.value = "";
    const id = formId.value;
    const body: Record<string, unknown> = { res: key };
    if (id) body.id = id;
    for (const f of meta.form) {
      if (f.createOnly && id) continue;
      if (f.editOnly && !id) continue;
      body[f.name] = f.type === "multiselect"
        ? fields[f.name].value.split(",").filter(Boolean)
        : fields[f.name].value;
    }
    const r = await api<{ messages?: Record<string, string> }>("POST", id ? "/api/res/update" : "/api/res/create", body);
    formBusy.value = false;
    if (r.ok) {
      formOpen.value = false;
      message.success(tr("crud.saved"));
      await load(false);
      props.onChanged?.();
      return;
    }
    if (r.status === 0) formTop.value = tr("crud.networkError");
    else {
      const msgs = { ...(r.data.messages ?? {}) };
      for (const f of r.data.fields ?? []) if (!msgs[f]) msgs[f] = tr("apiError.invalid");
      formErrors.value = msgs;
      formTop.value = r.data.message ?? tr("apiError.invalid");
    }
  }

  // ---- view modal
  const viewRow = createSignal<Row | null>(null);

  const doCreate = () => (props.onCreate ? props.onCreate() : openForm());
  const doEdit = (r: Row) => (props.onEdit ? props.onEdit(r) : openForm(r));
  const doView = (r: Row) => (props.onView ? props.onView(r) : (viewRow.value = r));

  // ---- export / print / import
  function exportAs(fmt: string): void {
    const cols = columnsVisible().filter((c) => !c.noExport).map((c) => c.prop).join(",");
    const p = listParams(query.value, meta, false);
    p.delete("page");
    p.delete("pageSize");
    p.set("res", key);
    p.set("format", fmt);
    p.set("cols", cols);
    const doc = g.document;
    if (!doc) return;
    const a = doc.createElement("a");
    a.href = `/api/res/download?${p}`;
    a.download = "";
    doc.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printTable(): void {
    const cols = columnsVisible();
    const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const head = cols.map((c) => `<th>${esc(c.label)}</th>`).join("");
    const body = rows.value
      .map((r) => `<tr>${cols.map((c) => `<td>${esc(displayValue(c as never, r, locale))}</td>`).join("")}</tr>`)
      .join("");
    const w = g.open?.("", "_blank");
    if (!w) return;
    w.document.write(
      `<!doctype html><title>${esc(meta.title)}</title><style>body{font:13px sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 8px;text-align:left}</style><h3>${esc(meta.title)}</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  function pickImport(): void {
    const doc = g.document;
    if (!doc) return;
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = ".csv,.json,text/csv,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let parsed: Record<string, string>[];
        if (file.name.toLowerCase().endsWith(".json")) {
          const j = JSON.parse(text);
          parsed = (Array.isArray(j) ? j : []).map((o: Record<string, unknown>) =>
            Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? "")]))
          );
        } else parsed = parseCsv(text);
        if (props.onImportRows) return props.onImportRows(parsed);
        // CSV/JSON headers may be display labels (our export) — map them back to props.
        const byLabel = new Map(meta.columns.map((c) => [c.label, c.prop]));
        const mapped = parsed.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [byLabel.get(k) ?? k, v])));
        const r = await api<{ created: number; failed: number }>("POST", "/api/res/importRows", { res: key, rows: mapped });
        if (r.ok) message.success(tr("panel.importDone", { created: r.data.created, failed: r.data.failed }));
        else message.error(r.data.message ?? tr("panel.importBad"));
        await load(false);
      } catch {
        message.error(tr("panel.importBad"));
      }
    };
    input.click();
  }

  // ---- toolbar
  const toolBtn = (label: string, onClick: () => void, icon: unknown, testid: string) => (
    <Button type="button" size="sm" aria-label={label} onClick={onClick} data-testid={testid}>
      {icon}
    </Button>
  );

  const exportMenu = (
    <div class="flex min-w-32 flex-col gap-0.5 p-1" data-testid="dp-export-menu">
      {(["xlsx", "csv", "json", "xml", "html"] as const).map((f) => (
        <button
          type="button"
          class="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          data-testid={`dp-export-${f}`}
          onClick={() => exportAs(f)}
        >
          {tr(`panel.fmt.${f}`)}
        </button>
      ))}
    </div>
  );

  const columnMenu = () => (
    <div class="flex max-h-72 min-w-40 flex-col gap-1 overflow-auto p-2" data-testid="dp-column-menu">
      {meta.columns.map((c) => (
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!hidden.value[c.prop]}
            data-testid={`dp-col-${c.prop}`}
            onChange={() => {
              const next = { ...hidden.value };
              if (next[c.prop]) delete next[c.prop];
              else next[c.prop] = true;
              saveHidden(next);
            }}
          />
          {c.label}
        </label>
      ))}
      <button
        type="button"
        class="mt-1 border-t border-slate-200 px-1 pt-2 text-left text-xs text-slate-500 hover:text-slate-800 dark:border-slate-700"
        data-testid="dp-col-reset"
        onClick={() => saveHidden(Object.fromEntries(meta.columns.filter((c) => c.hidden).map((c) => [c.prop, true])))}
      >
        {tr("panel.resetColumns")}
      </button>
    </div>
  );

  const toolbar = (
    <div class="flex w-full flex-wrap items-center justify-end gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700" data-testid="data-panel-toolbar">
      {props.toolbarExtra}
      <ButtonGroup attached>
        {(meta.caps.create || props.onCreate) && toolBtn(tr("panel.create"), doCreate, <IconPlus size="sm" />, "dp-create")}
        {meta.search.length > 0 &&
          toolBtn(tr("panel.search"), () => (showSearch.value = !showSearch.value), <IconSearch size="sm" />, "dp-search-toggle")}
        {toolBtn(tr("panel.refresh"), () => void load(false), <IconRefresh size="sm" />, "dp-refresh")}
        {toolBtn(tr("panel.print"), printTable, <IconPrinter size="sm" />, "dp-print")}
        {(meta.caps.import || props.onImportRows) && toolBtn(tr("panel.import"), pickImport, <IconUpload size="sm" />, "dp-import")}
        <Dropdown overlay={exportMenu} placement="bottomRight" trigger="click">
          <Button type="button" size="sm" class="px-2.5" aria-label={tr("panel.export")} data-testid="dp-export">
            <IconDownload size="sm" />
          </Button>
        </Dropdown>
        <Dropdown overlay={columnMenu()} placement="bottomRight" trigger="click">
          <Button type="button" size="sm" class="px-2.5" aria-label={tr("panel.column")} data-testid="dp-columns">
            <IconColumns size="sm" />
          </Button>
        </Dropdown>
      </ButtonGroup>
    </div>
  );

  // ---- search form
  const searchBar = () => {
    if (!showSearch.value || meta.search.length === 0) return null;
    const submit = (e?: Event) => {
      e?.preventDefault();
      const filters: Record<string, string> = {};
      for (const [k, v] of Object.entries(draft.value)) if (v.trim()) filters[k] = v.trim();
      setQuery({ filters: { ...filters, ...(meta.fixed ?? {}) }, page: 1 });
    };
    return (
      <form class="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700" data-testid="dp-search" onSubmit={submit}>
        {meta.search.map((s) => (
          <label class="flex flex-col gap-1 text-sm">
            <span>{s.label}</span>
            {s.type === "select"
              ? (
                <select
                  name={s.name}
                  class={SELECT_CLS}
                  data-testid={`dp-f-${s.name}`}
                  onChange={(e: Event) => (draft.value = { ...draft.value, [s.name]: (e.target as unknown as { value: string }).value })}
                >
                  <option value="">{tr("common.all")}</option>
                  {(s.options ?? []).map((o) => (
                    <option value={o.value} selected={draft.value[s.name] === o.value}>{o.label}</option>
                  ))}
                </select>
              )
              : (
                <Input
                  name={s.name}
                  type={s.type === "date" ? "date" : "text"}
                  value={draft.value[s.name] ?? ""}
                  data-testid={`dp-f-${s.name}`}
                  onInput={(e: Event) => (draft.value = { ...draft.value, [s.name]: (e.target as unknown as { value: string }).value })}
                />
              )}
          </label>
        ))}
        <Button type="submit" variant="primary" size="sm" data-testid="dp-search-submit">{tr("crud.search")}</Button>
        <Button
          type="button"
          size="sm"
          data-testid="dp-search-reset"
          onClick={() => {
            draft.value = {};
            setQuery({ filters: { ...(meta.fixed ?? {}) }, page: 1 });
          }}
        >
          {tr("crud.reset")}
        </Button>
      </form>
    );
  };

  // ---- batch bar
  const batchBar = () => {
    const ids = selected.value;
    if (!ids.length) return null;
    const sv = meta.statusValues ?? [];
    return (
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-sky-50 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" data-testid="dp-batch-bar">
        <span data-testid="dp-selected-count">{tr("panel.selected", { n: ids.length })}</span>
        {meta.caps.batchStatus && sv.map((s) => (
          <Button type="button" size="sm" data-testid={`dp-batch-status-${s.value}`} onClick={() => askStatus(ids, s.value, s.label)}>
            {tr("panel.batchSet", { status: s.label })}
          </Button>
        ))}
        {meta.caps.remove && (
          <Button type="button" size="sm" variant="danger" data-testid="dp-batch-delete" onClick={() => askDelete(ids, "")}>
            {tr("panel.batchDelete")}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" data-testid="dp-batch-clear" onClick={() => (selected.value = [])}>
          {tr("panel.clearSel")}
        </Button>
      </div>
    );
  };

  // ---- cells
  function cell(c: ResourceMeta["columns"][number], row: Row): unknown {
    const custom = props.renderCell?.[c.prop];
    if (custom) return custom(row);
    const raw = row[c.prop];
    const canEdit = meta.caps.update || props.onEdit || meta.statusField === c.prop;
    if (c.inline && canEdit && !row.locked) {
      if (c.inline === "switch" && c.options && c.options.length === 2) {
        const [on, off] = c.options;
        const isOn = String(raw) === on.value;
        return (
          <button
            type="button"
            role="switch"
            aria-checked={isOn ? "true" : "false"}
            data-testid={`dp-switch-${row.id}`}
            class={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOn ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
            title={isOn ? on.label : off.label}
            onClick={() => void setField(row, c.prop, isOn ? off.value : on.value)}
          >
            <span class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        );
      }
      if (c.inline === "text" || c.inline === "number") {
        const ed = editing.value;
        if (ed && ed.id === row.id && ed.prop === c.prop) {
          return (
            <input
              class="w-28 rounded border border-primary-400 px-1 py-0.5 text-sm dark:bg-slate-900"
              type={c.inline === "number" ? "number" : "text"}
              value={String(raw ?? "")}
              data-testid={`dp-inline-${c.prop}`}
              autofocus
              onKeyDown={(e: Event & { key: string }) => {
                const el = e.target as unknown as { value: string };
                if (e.key === "Enter") {
                  editing.value = null;
                  if (el.value !== String(raw ?? "")) void setField(row, c.prop, el.value);
                } else if (e.key === "Escape") editing.value = null;
              }}
              onBlur={(e: Event) => {
                const el = e.target as unknown as { value: string };
                editing.value = null;
                if (el.value !== String(raw ?? "")) void setField(row, c.prop, el.value);
              }}
            />
          );
        }
        return (
          <span
            class="cursor-text rounded px-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={tr("panel.dblEdit")}
            data-testid={`dp-edit-${c.prop}-${row.id}`}
            onDblClick={() => (editing.value = { id: row.id, prop: c.prop })}
          >
            {displayValue(c as never, row, locale) || "—"}
          </span>
        );
      }
    }
    switch (c.type) {
      case "tag": {
        const o = c.options?.find((x) => x.value === String(raw));
        return <span class={`inline-block rounded px-1.5 py-0.5 text-xs ${TONE[o?.tone ?? "default"]}`}>{o?.label ?? String(raw ?? "")}</span>;
      }
      case "image":
        return raw ? <img src={String(raw)} alt="" class="h-8 w-8 rounded object-cover" /> : "—";
      case "money":
        return <span class="tabular-nums">{fmtMoney(raw)}</span>;
      default: {
        const v = displayValue(c as never, row, locale);
        return v === "" ? "—" : v;
      }
    }
  }

  // ---- table
  const offset = () => (query.value.page - 1) * query.value.pageSize;
  const acts = !!(meta.caps.view || meta.caps.update || meta.caps.remove || props.onEdit || props.onView || props.rowExtra);

  const sortIcon = (prop: string) => {
    const q = query.value;
    if (q.sort !== prop) return <span class="ml-1 opacity-30">↕</span>;
    return q.order === 1 ? <IconChevronUp size="xs" class="ml-1 inline" /> : <IconChevronDown size="xs" class="ml-1 inline" />;
  };

  function toggleSort(prop: string): void {
    const q = query.value;
    if (q.sort !== prop) return setQuery({ sort: prop, order: 1, page: 1 });
    if (q.order === 1) return setQuery({ sort: prop, order: -1, page: 1 });
    // third click: back to the default order
    const ds = meta.defaultSort;
    setQuery({ sort: ds?.prop ?? "", order: ds?.order === "desc" ? -1 : 1, page: 1 });
  }

  const table = () => {
    const cols = columnsVisible();
    const data = rows.value;
    const sel = selected.value;
    const selectableRows = data.filter((r) => !r.locked);
    const allSel = selectableRows.length > 0 && selectableRows.every((r) => sel.includes(r.id));
    const t = totals.value;
    const hasTotals = cols.some((c) => c.total) && data.length > 0;
    return (
      <div class="relative overflow-x-auto">
        {loading.value && (
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60" data-testid="dp-loading">
            <span class="animate-pulse text-sm text-slate-500">{tr("crud.loading")}</span>
          </div>
        )}
        <table class="w-full border-collapse text-sm" data-testid="dp-table">
          <thead>
            <tr class="bg-slate-50 text-left dark:bg-slate-800">
              {selectable && (
                <th class="w-10 border border-slate-200 px-2 py-2 text-center dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={allSel}
                    data-testid="dp-select-all"
                    onChange={() => (selected.value = allSel ? [] : selectableRows.map((r) => r.id))}
                  />
                </th>
              )}
              <th class="w-12 border border-slate-200 px-2 py-2 text-center dark:border-slate-700">#</th>
              {cols.map((c) => (
                <th class="whitespace-nowrap border border-slate-200 px-3 py-2 font-medium dark:border-slate-700" style={c.width ? `width:${c.width}px` : undefined}>
                  {c.sortable
                    ? (
                      <button type="button" class="inline-flex items-center hover:text-primary-600" data-testid={`dp-sort-${c.prop}`} onClick={() => toggleSort(c.prop)}>
                        {c.label}
                        {sortIcon(c.prop)}
                      </button>
                    )
                    : c.label}
                </th>
              ))}
              {acts && <th class="border border-slate-200 px-3 py-2 text-center font-medium dark:border-slate-700">{tr("common.actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0
              ? (
                <tr>
                  <td colSpan={cols.length + 2 + (acts ? 1 : 0)} class="border border-slate-200 px-3 py-8 text-center text-slate-400 dark:border-slate-700" data-testid="dp-empty">
                    {tr("common.empty")}
                  </td>
                </tr>
              )
              : data.map((r, i) => (
                <tr class={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${i % 2 ? "bg-slate-50/50 dark:bg-slate-900/40" : ""}`} data-testid={`dp-row-${r.id}`}>
                  {selectable && (
                    <td class="border border-slate-200 px-2 py-1.5 text-center dark:border-slate-700">
                      <input
                        type="checkbox"
                        disabled={!!r.locked}
                        checked={sel.includes(r.id)}
                        data-testid={`dp-select-${r.id}`}
                        onChange={() => (selected.value = sel.includes(r.id) ? sel.filter((x) => x !== r.id) : [...sel, r.id])}
                      />
                    </td>
                  )}
                  <td class="border border-slate-200 px-2 py-1.5 text-center text-slate-500 dark:border-slate-700">{offset() + i + 1}</td>
                  {cols.map((c) => (
                    <td class="border border-slate-200 px-3 py-1.5 dark:border-slate-700">{cell(c, r)}</td>
                  ))}
                  {acts && (
                    <td class="whitespace-nowrap border border-slate-200 px-2 py-1.5 text-center dark:border-slate-700">
                      {props.rowExtra?.(r)}
                      {(meta.caps.view || props.onView) && (
                        <Button type="button" size="sm" variant="ghost" class={ICON_BTN} aria-label={tr("rbac.view")} data-testid={`dp-view-${r.id}`} onClick={() => doView(r)}>
                          <IconEye size="xs" />
                        </Button>
                      )}
                      {(meta.caps.update || props.onEdit) && (
                        <Button type="button" size="sm" variant="ghost" class={ICON_BTN} aria-label={tr("crud.edit")} data-testid={`dp-edit-${r.id}`} onClick={() => doEdit(r)}>
                          <IconEdit size="xs" />
                        </Button>
                      )}
                      {meta.caps.remove && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          class={`${ICON_BTN} !text-red-500`}
                          disabled={!!r.locked}
                          aria-label={tr("crud.delete")}
                          data-testid={`dp-delete-${r.id}`}
                          onClick={() => askDelete([r.id], rowName(r))}
                        >
                          <IconTrash size="xs" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr class="bg-slate-50 font-semibold dark:bg-slate-800" data-testid="dp-totals">
                {selectable && <td class="border border-slate-200 dark:border-slate-700" />}
                <td class="border border-slate-200 px-2 py-2 text-center dark:border-slate-700">{tr("panel.total")}</td>
                {cols.map((c) => (
                  <td class="border border-slate-200 px-3 py-2 dark:border-slate-700" data-testid={`dp-total-${c.prop}`}>
                    {c.total ? (c.type === "money" ? fmtMoney(t[c.prop]) : String(t[c.prop] ?? 0)) : ""}
                  </td>
                ))}
                {acts && <td class="border border-slate-200 dark:border-slate-700" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ---- pagination
  const pagination = () => {
    const q = query.value;
    const n = total.value;
    const last = Math.max(1, Math.ceil(n / q.pageSize));
    const from = n === 0 ? 0 : (q.page - 1) * q.pageSize + 1;
    const to = Math.min(n, q.page * q.pageSize);
    const go = (p: number) => {
      if (p < 1 || p > last || p === q.page) return;
      setQuery({ page: p });
    };
    const pbtn = "min-w-8 rounded border px-2 py-1 text-sm disabled:opacity-40";
    return (
      <div class="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm" data-testid="dp-pagination">
        <span data-testid="dp-range">{n === 0 ? tr("panel.rangeEmpty") : tr("panel.range", { from, to, total: n })}</span>
        <div class="flex flex-wrap items-center gap-2">
          <select
            class={SELECT_CLS}
            data-testid="dp-pagesize"
            onChange={(e: Event) => setQuery({ pageSize: Number((e.target as unknown as { value: string }).value), page: 1 })}
          >
            {[10, 20, 50, 100].map((s) => (
              <option value={String(s)} selected={s === q.pageSize}>{tr("panel.perPage", { n: s })}</option>
            ))}
          </select>
          <button type="button" class={`${pbtn} border-slate-300`} disabled={q.page <= 1} data-testid="dp-prev" onClick={() => go(q.page - 1)}>
            ‹
          </button>
          {pageList(q.page, last).map((p) =>
            p === "…"
              ? <span class="px-1">…</span>
              : (
                <button
                  type="button"
                  class={`${pbtn} ${p === q.page ? "border-primary-500 bg-primary-500 text-white" : "border-slate-300"}`}
                  data-testid={`dp-page-${p}`}
                  onClick={() => go(p)}
                >
                  {p}
                </button>
              )
          )}
          <button type="button" class={`${pbtn} border-slate-300`} disabled={q.page >= last} data-testid="dp-next" onClick={() => go(q.page + 1)}>
            ›
          </button>
          <label class="flex items-center gap-1">
            {tr("panel.jump")}
            <input
              class="w-14 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
              type="number"
              min="1"
              max={String(last)}
              value={jump.value}
              data-testid="dp-jump"
              onInput={(e: Event) => (jump.value = (e.target as unknown as { value: string }).value)}
              onKeyDown={(e: Event & { key: string }) => {
                if (e.key === "Enter") {
                  const p = Math.min(last, Math.max(1, Number.parseInt(jump.value, 10) || 1));
                  jump.value = "";
                  go(p);
                }
              }}
            />
            {tr("panel.page")}
          </label>
        </div>
      </div>
    );
  };

  // ---- form modal content
  const formBody = () => {
    const id = formId.value;
    const errs = formErrors.value;
    return (
      <form
        class="grid gap-3"
        data-testid="dp-form"
        onSubmit={(e: Event) => {
          e.preventDefault();
          void submitForm();
        }}
      >
        {meta.form.filter((f) => (id ? !f.editOnly || true : !f.editOnly) && !(f.createOnly && false)).map((f) => {
          const sig = fields[f.name];
          const ro = !!id && !!f.createOnly;
          const type = f.type ?? "text";
          let control: unknown;
          if (type === "textarea") {
            control = (
              <Textarea
                rows={4}
                value={sig}
                disabled={ro}
                data-testid={`dp-fld-${f.name}`}
                onInput={(e: Event) => (sig.value = (e.target as unknown as { value: string }).value)}
              />
            );
          } else if (type === "select") {
            control = (
              <select
                class={`${SELECT_CLS} w-full`}
                disabled={ro}
                data-testid={`dp-fld-${f.name}`}
                onChange={(e: Event) => (sig.value = (e.target as unknown as { value: string }).value)}
              >
                {!f.required && !(f.options ?? []).some((o) => o.value === "") && <option value="">—</option>}
                {(f.options ?? []).map((o) => <option value={o.value} selected={sig.value === o.value}>{o.label}</option>)}
              </select>
            );
          } else if (type === "multiselect") {
            const cur = sig.value.split(",").filter(Boolean);
            control = (
              <div class="flex flex-wrap gap-x-4 gap-y-1" data-testid={`dp-fld-${f.name}`}>
                {(f.options ?? []).map((o) => (
                  <label class="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={cur.includes(o.value)}
                      data-testid={`dp-fld-${f.name}-${o.value}`}
                      onChange={() => {
                        const now = sig.value.split(",").filter(Boolean);
                        sig.value = (now.includes(o.value) ? now.filter((x) => x !== o.value) : [...now, o.value]).join(",");
                      }}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            );
          } else if (type === "switch") {
            const on = f.onOff ? f.onOff[0] : "true";
            const off = f.onOff ? f.onOff[1] : "false";
            control = (
              <button
                type="button"
                role="switch"
                data-testid={`dp-fld-${f.name}`}
                aria-checked={sig.value === on ? "true" : "false"}
                class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sig.value === on ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                onClick={() => (sig.value = sig.value === on ? off : on)}
              >
                <span class={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${sig.value === on ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            );
          } else {
            control = (
              <Input
                type={type === "number" ? "number" : type === "password" ? "password" : type === "date" ? "date" : type === "datetime" ? "datetime-local" : "text"}
                value={sig}
                readOnly={ro}
                autoComplete={type === "password" ? "new-password" : "off"}
                placeholder={f.placeholder}
                data-testid={`dp-fld-${f.name}`}
                onInput={(e: Event) => (sig.value = (e.target as unknown as { value: string }).value)}
              />
            );
          }
          return (
            <FormItem label={f.label} required={!!f.required && !(f.type === "password" && !!id)} error={errs[f.name]}>
              {control}
            </FormItem>
          );
        })}
        {formTop.value && !Object.keys(errs).length && <p class="m-0 text-sm text-red-600" data-testid="dp-form-error">{formTop.value}</p>}
        <div class="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={() => (formOpen.value = false)} data-testid="dp-form-cancel">{tr("crud.cancel")}</Button>
          <Button type="submit" variant="primary" loading={formBusy.value} data-testid="dp-form-submit">{tr("crud.confirm")}</Button>
        </div>
      </form>
    );
  };

  const viewBody = () => {
    const r = viewRow.value;
    if (!r) return null;
    const seen = new Set<string>();
    const items: { label: string; children: unknown }[] = [];
    for (const c of meta.columns) {
      seen.add(c.prop);
      items.push({ label: c.label, children: displayValue(c as never, r, locale) || "—" });
    }
    for (const f of meta.form) {
      if (seen.has(f.name) || f.type === "password") continue;
      const raw = r[f.name];
      items.push({ label: f.label, children: raw === undefined || raw === null || raw === "" ? "—" : String(raw) });
    }
    return <Descriptions class="adm-desc-chrome" bordered column={1} size="sm" items={items} />;
  };

  return (
    <div class="contents" data-testid={`panel-${key}`}>
      <Card
        bordered
        size="sm"
        class="adm-panel-card"
        headerClass="adm-card-header"
        title={
          <span class="inline-flex min-w-0 items-center gap-2">
            <IconList size="sm" />
            <span class="truncate">{meta.title}</span>
          </span>
        }
        extra={<span class="text-sm font-normal" data-testid="dp-total-count">{() => tr("crud.total", { total: total.value })}</span>}
        bodyClass="p-0"
        data-testid="data-panel"
      >
        {toolbar}
        {searchBar}
        {batchBar}
        <div class="px-2.5 py-2.5">{table}</div>
        {pagination}
      </Card>

      {props.children}

      <Modal
        open={formOpen}
        title={() => `${formId.value ? tr("crud.edit") : tr("crud.add")} · ${meta.title}`}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => (formOpen.value = false)}
        children={formBody}
      />
      <Modal
        open={() => viewRow.value !== null}
        title={() => `${tr("rbac.view")} · ${meta.title}`}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => (viewRow.value = null)}
        children={viewBody}
      />
      <Modal
        open={() => confirm.value !== null}
        title={() => confirm.value?.title ?? ""}
        width="sm"
        keyboard
        destroyOnClose
        onClose={() => (confirm.value = null)}
        children={() => (
          <div data-testid="dp-confirm">
            <p class="mb-5 text-sm" data-testid="dp-confirm-text">{confirm.value?.text}</p>
            <div class="flex justify-end gap-2">
              <Button type="button" data-testid="dp-confirm-cancel" onClick={() => (confirm.value = null)}>{tr("crud.cancel")}</Button>
              <Button
                type="button"
                variant={confirm.value?.danger ? "danger" : "primary"}
                loading={confirmBusy.value}
                data-testid="dp-confirm-ok"
                onClick={async () => {
                  const c = confirm.value;
                  if (!c || confirmBusy.value) return;
                  confirmBusy.value = true;
                  try {
                    await c.run();
                  } finally {
                    confirmBusy.value = false;
                    confirm.value = null;
                  }
                }}
              >
                {confirm.value?.okText}
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default DataPanel;
