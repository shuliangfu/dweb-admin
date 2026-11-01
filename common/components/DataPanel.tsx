/**
 * DataPanel — callable list "数据面板／数据展示面板" for admin pages.
 *
 * Vue reference (confirmed): `/home/vue/dreamer-vue/src/components/Card/CardPanel.vue`
 * Composes `@dreamer/ui-view` only — do not fork a second UI kit.
 */
import { createSignal, type JSXRenderable } from "@dreamer/view";
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Input,
  Table,
  message,
  type TableProps,
} from "@dreamer/ui-view";

/** Mirrors Vue CardPanel `table.tools` flags. */
export type DataPanelTools = {
  create?: boolean;
  search?: boolean;
  refresh?: boolean;
  export?: boolean;
  import?: boolean;
  print?: boolean;
  column?: boolean;
};

export type DataPanelColumn<T = unknown> = {
  prop: string;
  label: string;
  width?: number | string;
  hidden?: boolean;
  /** Optional custom cell renderer; falls back to record[prop]. */
  render?: (value: unknown, record: T, index: number) => unknown;
};

/** Vue FormSearch-style field (GET query). */
export type DataPanelSearchField = {
  name: string;
  label?: string;
  placeholder?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  defaultValue?: string;
};

/** Context passed to function `children` so custom Tables can hide columns. */
export type DataPanelChildrenCtx = {
  /** prop → hidden */
  hidden: Record<string, boolean>;
  isColumnHidden: (prop: string) => boolean;
  /** Filter ui-view Table column defs that use `key` === prop (or dataIndex). */
  filterTableColumns: <C extends { key?: string; dataIndex?: string }>(cols: C[]) => C[];
};

export type DataPanelProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  title: string;
  info?: string;
  tools?: DataPanelTools;
  actions?: { view?: boolean; update?: boolean; delete?: boolean };
  columns?: DataPanelColumn<T>[];
  rows?: T[];
  rowKey?: string;
  searchSlot?: unknown;
  searchSchemas?: DataPanelSearchField[];
  searchLabels?: { open?: string; submit?: string; reset?: string };
  toolbarExtra?: unknown;
  /**
   * Custom body. Prefer a function so column toggles can hide cells:
   * `children={(ctx) => <Table columns={ctx.filterTableColumns(cols)} ... />}`.
   */
  children?: unknown | ((ctx: DataPanelChildrenCtx) => unknown);
  onCreate?: () => void;
  onRefresh?: () => void;
  onExport?: (format?: string) => void;
  onImport?: () => void;
  onImportFile?: (file: File) => void;
  /** Parsed CSV rows (header → values) after default import picker. */
  onImportRows?: (rows: Record<string, string>[], file: File) => void;
  onPrint?: () => void;
  onColumnVisibilityChange?: (hidden: Record<string, boolean>) => void;
  toolLabels?: Partial<
    Record<
      | "export"
      | "import"
      | "print"
      | "column"
      | "soon"
      | "search"
      | "resetColumns"
      | "csv"
      | "unsupportedFormat",
      string
    >
  >;
  tableProps?: Partial<TableProps<T>>;
  emptyText?: string;
  class?: string;
};

type DomDoc = {
  createElement: (tag: string) => {
    href?: string;
    download?: string;
    click: () => void;
    type?: string;
    accept?: string;
    files?: { 0?: File; length: number; item?: (i: number) => File | null } | null;
    onchange: ((ev: Event) => void) | null;
  };
};

function dom(): DomDoc | undefined {
  return (globalThis as { document?: DomDoc }).document;
}

function toTableColumns<T extends Record<string, unknown>>(
  columns: DataPanelColumn<T>[],
  hidden: Record<string, boolean>,
): TableProps<T>["columns"] {
  return columns
    .filter((c) => !(hidden[c.prop] ?? c.hidden))
    .map((c) => ({
      key: c.prop,
      title: c.label,
      dataIndex: c.prop,
      width: c.width,
      render: c.render
        ? (value: unknown, record: T, index: number) => c.render!(value, record, index)
        : undefined,
    })) as TableProps<T>["columns"];
}

/** Escape one CSV cell (RFC-style quotes). */
function escCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(
  columns: { prop: string; label: string }[],
  rows: Record<string, unknown>[],
  filename = "export.csv",
): void {
  const doc = dom();
  if (!doc) return;
  const header = columns.map((c) => escCsv(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escCsv(r[c.prop])).join(",")).join("\n");
  const blob = new Blob([`\ufeff${header}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal CSV parser (quoted fields, comma sep, first row = headers). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const src = text.replace(/^\ufeff/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.length)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = cells[i] ?? "";
    });
    return obj;
  });
}

function makeChildrenCtx(hidden: Record<string, boolean>): DataPanelChildrenCtx {
  return {
    hidden,
    isColumnHidden: (prop: string) => !!(hidden[prop]),
    filterTableColumns: <C extends { key?: string; dataIndex?: string }>(cols: C[]) =>
      cols.filter((c) => {
        const prop = String(c.key ?? c.dataIndex ?? "");
        if (!prop || prop === "selection") return true;
        return !hidden[prop];
      }),
  };
}

/**
 * Shared list panel chrome. Prefer function `children` when embedding a custom
 * Table so column toggles can hide columns; or use `columns`+`rows` built-in.
 */
export function DataPanel<T extends Record<string, unknown> = Record<string, unknown>>(
  props: DataPanelProps<T>,
): JSXRenderable {
  const tools = props.tools ?? {};
  const rows = props.rows ?? [];
  const columns = props.columns ?? [];
  const labels = props.toolLabels ?? {};
  const searchLabels = props.searchLabels ?? {};

  const showSearch = createSignal(false);
  const hiddenCols = createSignal<Record<string, boolean>>(
    Object.fromEntries(columns.filter((c) => c.hidden).map((c) => [c.prop, true])),
  );

  const soon = () => message.info(labels.soon ?? "Coming soon");

  function visibleExportColumns() {
    const h = hiddenCols.value;
    return columns.filter(
      (c) => !(h[c.prop] ?? false) && c.prop !== "actions" && c.prop !== "selection",
    );
  }

  function doExport(format = "csv") {
    if (props.onExport) {
      props.onExport(format);
      return;
    }
    if (format !== "csv") {
      message.info(labels.unsupportedFormat ?? labels.soon ?? "Format not available");
      return;
    }
    if (!columns.length || !rows.length) {
      soon();
      return;
    }
    downloadCsv(
      visibleExportColumns().map((c) => ({ prop: c.prop, label: c.label })),
      rows as Record<string, unknown>[],
    );
  }

  function doImport() {
    if (props.onImport) {
      props.onImport();
      return;
    }
    const doc = dom();
    if (!doc) return;
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async () => {
      const file = (input.files?.item?.(0) ?? input.files?.[0]) as File | undefined;
      if (!file) return;
      props.onImportFile?.(file);
      if (props.onImportRows) {
        try {
          const text = await file.text();
          const parsed = parseCsv(text);
          props.onImportRows(parsed, file);
        } catch {
          message.info(labels.soon ?? "Import failed");
        }
      } else if (!props.onImportFile) {
        message.info(`${labels.import ?? "Import"}: ${file.name}`);
      }
    };
    input.click();
  }

  function doPrint() {
    if (props.onPrint) {
      props.onPrint();
      return;
    }
    (globalThis as { print?: () => void }).print?.();
  }

  function toggleColumn(prop: string) {
    const next = { ...hiddenCols.value };
    if (next[prop]) delete next[prop];
    else next[prop] = true;
    hiddenCols.value = next;
    props.onColumnVisibilityChange?.(next);
  }

  function resetColumns() {
    hiddenCols.value = {};
    props.onColumnVisibilityChange?.({});
  }

  const hasSearchUi = !!(tools.search && (props.searchSlot || (props.searchSchemas && props.searchSchemas.length)));

  // CSV only by default — no xlsx/exceljs in deps; other formats stay unavailable.
  const exportOverlay = (
    <div class="flex min-w-[8rem] flex-col gap-0.5 p-1">
      <button
        type="button"
        class="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => doExport("csv")}
      >
        {labels.csv ?? "CSV"}
      </button>
      <button
        type="button"
        class="rounded px-2 py-1.5 text-left text-xs text-slate-400"
        onClick={() =>
          message.info(labels.unsupportedFormat ?? "Excel/XML/HTML need a library — not bundled")
        }
      >
        Excel / XML / HTML
      </button>
    </div>
  );

  const columnOverlay = () => {
    const h = hiddenCols.value;
    const defs = columns.filter((c) => c.prop !== "selection");
    return (
      <div class="flex max-h-72 min-w-[10rem] flex-col gap-1 overflow-auto p-2">
        {defs.map((c) => (
          <Checkbox
            checked={!(h[c.prop] ?? false)}
            onChange={() => toggleColumn(c.prop)}
          >
            {c.label}
          </Checkbox>
        ))}
        <button
          type="button"
          class="mt-1 rounded border-t border-slate-200 px-1 pt-2 text-left text-xs text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200"
          onClick={resetColumns}
        >
          {labels.resetColumns ?? "Reset columns"}
        </button>
      </div>
    );
  };

  const toolbar = (
    <div class="flex flex-wrap items-center gap-2">
      {hasSearchUi && (
        <Button
          type="button"
          size="sm"
          onClick={() => {
            showSearch.value = !showSearch.value;
          }}
        >
          {labels.search ?? searchLabels.open ?? "Search"}
        </Button>
      )}
      {tools.create && props.onCreate && (
        <Button type="button" variant="primary" onClick={props.onCreate}>
          +
        </Button>
      )}
      {tools.refresh && props.onRefresh && (
        <Button type="button" onClick={props.onRefresh}>
          ↻
        </Button>
      )}
      {tools.export && (
        <Dropdown overlay={exportOverlay} placement="bottomRight" trigger="click">
          <Button type="button" size="sm">
            {labels.export ?? "Export"}
          </Button>
        </Dropdown>
      )}
      {tools.import && (
        <Button type="button" size="sm" onClick={doImport}>
          {labels.import ?? "Import"}
        </Button>
      )}
      {tools.print && (
        <Button type="button" size="sm" onClick={doPrint}>
          {labels.print ?? "Print"}
        </Button>
      )}
      {tools.column && columns.length > 0 && (
        <Dropdown overlay={columnOverlay()} placement="bottomRight" trigger="click">
          <Button type="button" size="sm">
            {labels.column ?? "Columns"}
          </Button>
        </Dropdown>
      )}
      {tools.column && columns.length === 0 && (
        <Button type="button" size="sm" onClick={soon}>
          {labels.column ?? "Columns"}
        </Button>
      )}
      {props.toolbarExtra}
    </div>
  );

  const titleNode = (
    <div class="flex min-w-0 flex-col gap-0.5">
      <span class="truncate text-base font-semibold">{props.title}</span>
      {props.info != null && props.info !== "" && (
        <span class="truncate text-xs text-slate-500 dark:text-slate-400">{props.info}</span>
      )}
    </div>
  );

  const searchBar = () => {
    if (!hasSearchUi || !showSearch.value) return null;
    if (props.searchSlot) {
      return <div class="mb-3 border-b border-slate-100 pb-3 dark:border-slate-800">{props.searchSlot}</div>;
    }
    const schemas = props.searchSchemas ?? [];
    return (
      <form method="get" class="mb-3 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        {schemas.map((f) => (
          <label class="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
            {f.label ? <span>{f.label}</span> : null}
            {f.type === "select" ? (
              <select
                name={f.name}
                class="min-w-[10rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">{f.placeholder ?? "—"}</option>
                {(f.options ?? []).map((o) => (
                  <option value={o.value} selected={o.value === (f.defaultValue ?? "")}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                name={f.name}
                value={f.defaultValue ?? ""}
                placeholder={f.placeholder}
                class="w-48"
              />
            )}
          </label>
        ))}
        <Button type="submit" variant="primary" size="sm">
          {searchLabels.submit ?? "Search"}
        </Button>
        <Button type="reset" size="sm">
          {searchLabels.reset ?? "Reset"}
        </Button>
      </form>
    );
  };

  const ctx = makeChildrenCtx(hiddenCols.value);
  const body = (() => {
    const ch = props.children;
    if (typeof ch === "function") {
      return (ch as (c: DataPanelChildrenCtx) => unknown)(ctx);
    }
    if (ch != null) return ch;
    return (
      <Table
        bordered
        hoverable
        size="sm"
        rowKey={props.rowKey ?? "id"}
        dataSource={rows}
        columns={toTableColumns(columns, hiddenCols.value)}
        pagination={{ pageSize: 20, total: rows.length }}
        locale={{ emptyText: props.emptyText ?? "—" }}
        {...(props.tableProps as object)}
      />
    );
  })();

  return (
    <Card
      bordered
      size="sm"
      class={props.class}
      title={titleNode}
      extra={toolbar}
      bodyClass="pt-3"
    >
      {searchBar()}
      {body}
    </Card>
  );
}

export default DataPanel;
