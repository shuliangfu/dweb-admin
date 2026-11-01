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


type DomDoc = {
  createElement: (tag: string) => {
    href?: string;
    download?: string;
    click: () => void;
    type?: string;
    accept?: string;
    files?: { 0?: File; length: number } | null;
    onchange: ((ev: Event) => void) | null;
  };
  documentElement?: { style: { setProperty: (k: string, v: string) => void } };
};
function dom(): DomDoc | undefined {
  return (globalThis as { document?: DomDoc }).document;
}

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

export type DataPanelProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  /** Panel title (Vue `table.title`). */
  title: string;
  /** Optional subtitle / store info line (Vue `store.info`). */
  info?: string;
  /** Toolbar capability flags (Vue `table.tools`). */
  tools?: DataPanelTools;
  /** Row action hints for callers (Vue `table.actions`) — reserved. */
  actions?: { view?: boolean; update?: boolean; delete?: boolean };
  /** Column defs when using built-in Table; also drives column dropdown + CSV. */
  columns?: DataPanelColumn<T>[];
  /** Row data when using built-in Table / default export. */
  rows?: T[];
  rowKey?: string;
  /** Custom search slot (takes precedence over searchSchemas form body). */
  searchSlot?: unknown;
  /** Schema-driven GET search form (Vue FormSearch subset). */
  searchSchemas?: DataPanelSearchField[];
  /** Labels for search open / submit / reset. */
  searchLabels?: { open?: string; submit?: string; reset?: string };
  /** Extra toolbar nodes (right side). */
  toolbarExtra?: unknown;
  /** Replace built-in Table entirely (e.g. existing Admin table). */
  children?: unknown;
  onCreate?: () => void;
  onRefresh?: () => void;
  /** Override default CSV download of visible columns. */
  onExport?: (format?: string) => void;
  /** Override default file-picker import. */
  onImport?: () => void;
  /** Called with selected File when default import picker is used. */
  onImportFile?: (file: File) => void;
  /** Override default window.print(). */
  onPrint?: () => void;
  /** Called when column visibility changes (prop → hidden). */
  onColumnVisibilityChange?: (hidden: Record<string, boolean>) => void;
  /** Labels for toolbar tools. */
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
      | "excel"
      | "xml"
      | "html",
      string
    >
  >;
  /** Forwarded to ui-view Table when using built-in table. */
  tableProps?: Partial<TableProps<T>>;
  emptyText?: string;
  class?: string;
};

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

function downloadCsv(
  columns: { prop: string; label: string }[],
  rows: Record<string, unknown>[],
  filename = "export.csv",
): void {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.prop])).join(","))
    .join("\n");
  const doc = dom();
  if (!doc) return;
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Shared list panel chrome. Prefer passing `children` while migrating existing
 * Admin pages; switch to `columns`+`rows` once each page drops bespoke tables.
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
    return columns.filter((c) => !(h[c.prop] ?? false) && c.prop !== "actions" && c.prop !== "selection");
  }

  function doExport(format = "csv") {
    if (props.onExport) {
      props.onExport(format);
      return;
    }
    if (!columns.length || !rows.length) {
      soon();
      return;
    }
    if (format !== "csv") {
      message.info(labels.soon ?? "Coming soon");
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
    input.accept = ".csv,.xlsx,.xls,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (props.onImportFile) props.onImportFile(file);
      else message.info(`${labels.import ?? "Import"}: ${file.name}`);
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
    const next = { ...hiddenCols.value, [prop]: !hiddenCols.value[prop] };
    if (!next[prop]) delete next[prop];
    hiddenCols.value = next;
    props.onColumnVisibilityChange?.(next);
  }

  function resetColumns() {
    hiddenCols.value = {};
    props.onColumnVisibilityChange?.({});
  }

  const hasSearchUi = !!(tools.search && (props.searchSlot || (props.searchSchemas && props.searchSchemas.length)));

  const exportOverlay = (
    <div class="flex min-w-[7rem] flex-col gap-0.5 p-1">
      {(["csv", "excel", "xml", "html"] as const).map((fmt) => (
        <button
          type="button"
          class="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => doExport(fmt)}
        >
          {(labels[fmt] ?? fmt).toUpperCase()}
        </button>
      ))}
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
      {props.children != null ? (
        props.children
      ) : (
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
      )}
    </Card>
  );
}

export default DataPanel;
