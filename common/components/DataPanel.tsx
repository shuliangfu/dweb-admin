/**
 * DataPanel — callable list "数据面板／数据展示面板" for admin pages.
 *
 * Vue reference (confirmed): `/home/vue/dreamer-vue/src/components/Card/CardPanel.vue`
 * Export helpers mirror Vue `utils/excel.js` (CSV + HTML-table-as-.xls; JSON/XML/HTML
 * are plain text — no xlsx/OOXML package in extension deps).
 * Composes `@dreamer/ui-view` only — do not fork a second UI kit.
 */
import { createSignal, type JSXRenderable } from "@dreamer/view";
import {
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Dropdown,
  IconCode,
  IconColumns,
  IconDownload,
  IconEdit,
  IconEye,
  IconFile,
  IconFileText,
  IconList,
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tooltip,
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

/** Fields for the create modal (Vue ModalForm). */
export type DataPanelFormField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "select" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
};
export type DataPanelSearchField = {
  name: string;
  label?: string;
  placeholder?: string;
  type?: "text" | "select" | "date";
  options?: { value: string; label: string }[];
  defaultValue?: string;
};

/** Context passed to function `children` so custom Tables can hide columns. */
export type DataPanelChildrenCtx = {
  /** prop → hidden */
  hidden: Record<string, boolean>;
  isColumnHidden: (prop: string) => boolean;
  /** Filter ui-view Table column defs that use `key` === prop (or dataIndex). */
  filterTableColumns: <C extends { key: string; dataIndex?: string }>(cols: C[]) => C[];
};

export type DataPanelExportFormat = "csv" | "json" | "xml" | "html" | "excel";

export type DataPanelProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  title: string;
  info?: string;
  tools?: DataPanelTools;
  actions?: { view?: boolean; update?: boolean; delete?: boolean; download?: boolean };
  /** Vue `table.tabs` — segmented control on the left of the tool group. */
  tabs?: { label: string; value: string }[];
  onTabChange?: (value: string) => void;
  columns?: DataPanelColumn<T>[];
  rows?: T[];
  rowKey?: string;
  /** Download basename without extension (default: export). */
  exportFilename?: string;
  searchSlot?: unknown;
  searchSchemas?: DataPanelSearchField[];
  /** Create-modal fields. When omitted and `onCreate` is absent, columns are used. */
  formSchemas?: DataPanelFormField[];
  formTitle?: string;
  /** Header-right count, e.g. 第1-20条，共208条数据. */
  summary?: string;
  total?: number;
  searchLabels?: { open?: string; submit?: string; reset?: string };
  toolbarExtra?: unknown;
  /**
   * Custom body. Prefer a function so column toggles can hide cells:
   * `children={(ctx) => <Table columns={ctx.filterTableColumns(cols)} ... />}`.
   */
  children?: unknown | ((ctx: DataPanelChildrenCtx) => unknown);
  onCreate?: () => void;
  /** Called when the built-in create modal is submitted. No save when omitted. */
  onFormSubmit?: (data: Record<string, string>) => void;
  /** Row action handlers (Vue CardPanel table.onView / onUpdate / onDelete). */
  onView?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
  onDownload?: (row: T) => void;
  /** Labels for built-in action column buttons. */
  actionLabels?: {
    view?: string;
    update?: string;
    delete?: string;
    download?: string;
    column?: string;
    confirmDelete?: string;
    ok?: string;
    cancel?: string;
  };
  onRefresh?: () => void;
  onExport?: (format?: DataPanelExportFormat) => void;
  onImport?: () => void;
  onImportFile?: (file: File) => void;
  /** Parsed rows (header → values) after default CSV/JSON import picker. */
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
      | "create"
      | "refresh"
      | "range"
      | "resetColumns"
      | "csv"
      | "json"
      | "xml"
      | "html"
      | "excel"
      | "unsupportedFormat"
      | "xlsxGap",
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
    style?: string;
    files?: { 0?: File; length: number; item?: (i: number) => File | null } | null;
    onchange: ((ev: Event) => void) | null;
  };
  body?: { appendChild: (n: unknown) => void; removeChild: (n: unknown) => void };
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

function escXml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escHtml(v: unknown): string {
  return escXml(v);
}

function cellValue(row: Record<string, unknown>, prop: string): unknown {
  if (!prop.includes(".")) return row[prop];
  let cur: unknown = row;
  for (const key of prop.split(".")) {
    if (cur == null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur ?? "";
}

function downloadBlob(blob: Blob, filename: string): void {
  const doc = dom();
  if (!doc) return;
  const url = URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = filename;
  a.style = "visibility:hidden";
  doc.body?.appendChild(a);
  a.click();
  doc.body?.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(
  columns: { prop: string; label: string }[],
  rows: Record<string, unknown>[],
  filename = "export.csv",
): void {
  const header = columns.map((c) => escCsv(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escCsv(cellValue(r, c.prop))).join(","))
    .join("\n");
  downloadBlob(
    new Blob([`\ufeff${header}\n${body}`], { type: "text/csv;charset=utf-8" }),
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
}

/** JSON array of objects keyed by column labels (visible columns only). */
export function downloadJson(
  columns: { prop: string; label: string }[],
  rows: Record<string, unknown>[],
  filename = "export.json",
): void {
  const data = rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const c of columns) obj[c.label] = cellValue(r, c.prop) ?? "";
    return obj;
  });
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }),
    filename.endsWith(".json") ? filename : `${filename}.json`,
  );
}

/** Simple row XML (`<rows><row…/></rows>`). */
export function downloadXml(
  columns: { prop: string; label: string }[],
  rows: Record<string, unknown>[],
  filename = "export.xml",
): void {
  const parts = ['<?xml version="1.0" encoding="UTF-8"?>', "<rows>"];
  for (const r of rows) {
    parts.push("  <row>");
    for (const c of columns) {
      const tag = c.prop.replace(/[^\w.-]/g, "_") || "field";
      parts.push(`    <${tag} label="${escXml(c.label)}">${escXml(cellValue(r, c.prop))}</${tag}>`);
    }
    parts.push("  </row>");
  }
  parts.push("</rows>");
  downloadBlob(
    new Blob([parts.join("\n")], { type: "application/xml;charset=utf-8" }),
    filename.endsWith(".xml") ? filename : `${filename}.xml`,
  );
}

/** HTML table download (also used for Vue-style Excel .xls MIME trick). */
export function downloadHtmlTable(
  columns: { prop: string; label: string }[],
  rows: Record<string, unknown>[],
  filename = "export.html",
  opts?: { asExcel?: boolean; title?: string },
): void {
  const head = columns.map((c) => `<th align="center">${escHtml(c.label)}</th>`).join("");
  const body = rows
    .map((r) => {
      const cells = columns
        .map((c) => `<td align="center">${escHtml(cellValue(r, c.prop))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const table = `<table><tr>${head}</tr>${body}</table>`;
  if (opts?.asExcel) {
    const excelFile =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">` +
      `<body>${table}</body></html>`;
    downloadBlob(
      new Blob([excelFile], { type: "application/vnd.ms-excel" }),
      filename.endsWith(".xls") ? filename : `${filename}.xls`,
    );
    return;
  }
  const title = escHtml(opts?.title ?? "export");
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
    `<body>${table}</body></html>`;
  downloadBlob(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    filename.endsWith(".html") ? filename : `${filename}.html`,
  );
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

/** Parse a JSON array of objects into string-valued rows (import). */
export function parseJsonRows(text: string): Record<string, string>[] {
  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const obj: Record<string, string> = {};
    if (item && typeof item === "object") {
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        obj[k] = v == null ? "" : String(v);
      }
    }
    return obj;
  });
}

function makeChildrenCtx(hidden: Record<string, boolean>): DataPanelChildrenCtx {
  return {
    hidden,
    isColumnHidden: (prop: string) => !!(hidden[prop]),
    filterTableColumns: <C extends { key: string; dataIndex?: string }>(cols: C[]) =>
      cols.filter((c) => {
        const prop = String(c.key ?? c.dataIndex ?? "");
        if (!prop || prop === "selection") return true;
        return !hidden[prop];
      }),
  };
}

function toolBtn(
  label: string,
  onClick: () => void,
  icon: unknown,
): JSXRenderable {
  return (
    <Tooltip content={label} placement="top">
      <Button type="button" size="sm" class="px-2.5" aria-label={label} onClick={onClick}>
        {icon}
      </Button>
    </Tooltip>
  );
}

export type RowActionsProps = {
  viewLabel?: string;
  updateLabel?: string;
  deleteLabel?: string;
  downloadLabel?: string;
  /** When true (default), delete asks with Popconfirm before `onDelete`. */
  confirmDelete?: boolean;
  confirmTitle?: string;
  okText?: string;
  cancelText?: string;
  onView?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  viewDisabled?: boolean;
  updateDisabled?: boolean;
  deleteDisabled?: boolean;
};

const iconLinkCls =
  "!bg-transparent !border-0 !shadow-none hover:!bg-transparent px-1 py-1 text-slate-300 hover:text-white";
const iconDangerCls =
  "!bg-transparent !border-0 !shadow-none hover:!bg-transparent px-1 py-1 !text-red-400 hover:!text-red-300";

function iconAct(
  label: string,
  icon: unknown,
  onClick: () => void,
  tone: "link" | "danger" = "link",
  disabled = false,
): JSXRenderable {
  return (
    <Tooltip content={label} placement="top">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class={tone === "danger" ? iconDangerCls : iconLinkCls}
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

/** Vue row actions: icon-only link buttons (no filled background). */
export function RowActions(props: RowActionsProps): JSXRenderable {
  const open = createSignal(false);
  const ask = props.confirmDelete !== false && !!props.onDelete;
  return (
    <span class="inline-flex items-center gap-1">
      {props.onView &&
        iconAct(props.viewLabel ?? "View", <IconEye size="xs" />, props.onView, "link", props.viewDisabled)}
      {props.onUpdate &&
        iconAct(props.updateLabel ?? "Edit", <IconEdit size="xs" />, props.onUpdate, "link", props.updateDisabled)}
      {props.onDownload &&
        iconAct(props.downloadLabel ?? "Download", <IconDownload size="xs" />, props.onDownload)}
      {props.onDelete && (ask
        ? (
          <Popconfirm
            open={open}
            title={props.confirmTitle ?? "你确定要删除吗？"}
            danger
            okText={props.okText}
            cancelText={props.cancelText}
            onOpenChange={(v) => {
              open.value = v;
            }}
            onConfirm={() => props.onDelete?.()}
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              class={iconDangerCls}
              disabled={props.deleteDisabled}
              aria-label={props.deleteLabel ?? "Delete"}
              onClick={() => {
                open.value = true;
              }}
            >
              <IconTrash size="xs" />
            </Button>
          </Popconfirm>
        )
        : iconAct(
          props.deleteLabel ?? "Delete",
          <IconTrash size="xs" />,
          props.onDelete,
          "danger",
          props.deleteDisabled,
        ))}
    </span>
  );
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
  const baseName = props.exportFilename ?? "export";

  const showSearch = createSignal(false);
  const formOpen = createSignal(false);
  const hiddenCols = createSignal<Record<string, boolean>>(
    Object.fromEntries(columns.filter((c) => c.hidden).map((c) => [c.prop, true])),
  );
  const tab = createSignal(props.tabs?.[0]?.value ?? "");

  const soon = () => message.info(labels.soon ?? "Coming soon");

  function visibleExportColumns() {
    const h = hiddenCols.value;
    return columns.filter(
      (c) => !(h[c.prop] ?? false) && c.prop !== "actions" && c.prop !== "selection" && c.prop !== "idx",
    );
  }

  function doExport(format: DataPanelExportFormat = "csv") {
    if (props.onExport) {
      props.onExport(format);
      return;
    }
    const cols = visibleExportColumns().map((c) => ({ prop: c.prop, label: c.label }));
    if (!cols.length) {
      soon();
      return;
    }
    const data = rows as Record<string, unknown>[];
    switch (format) {
      case "csv":
        downloadCsv(cols, data, baseName);
        return;
      case "json":
        downloadJson(cols, data, baseName);
        return;
      case "xml":
        downloadXml(cols, data, baseName);
        return;
      case "html":
        downloadHtmlTable(cols, data, baseName, { title: props.title });
        return;
      case "excel":
        // Vue excel.js: HTML table with MS Excel MIME — not OOXML .xlsx.
        downloadHtmlTable(cols, data, baseName, { asExcel: true, title: props.title });
        return;
      default:
        message.info(
          labels.xlsxGap ??
            labels.unsupportedFormat ??
            "Native .xlsx needs a library — not bundled",
        );
    }
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
    input.accept = ".csv,text/csv,.json,application/json";
    input.onchange = async () => {
      const file = (input.files?.item?.(0) ?? input.files?.[0]) as File | undefined;
      if (!file) return;
      props.onImportFile?.(file);
      if (props.onImportRows) {
        try {
          const text = await file.text();
          const lower = file.name.toLowerCase();
          const parsed = lower.endsWith(".json") || file.type.includes("json")
            ? parseJsonRows(text)
            : parseCsv(text);
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

  const exportOverlay = (
    <div class="flex min-w-32 flex-col gap-0.5 p-1" data-testid="data-panel-export-menu">
      {(
        [
          ["csv", labels.csv ?? "CSV", <IconFileText size="xs" />],
          ["excel", labels.excel ?? "Excel", <IconFile size="xs" />],
          ["json", labels.json ?? "JSON", <IconCode size="xs" />],
          ["xml", labels.xml ?? "XML", <IconCode size="xs" />],
          ["html", labels.html ?? "HTML", <IconFileText size="xs" />],
        ] as const
      ).map(([fmt, label, icon]) => (
        <button
          type="button"
          class="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => doExport(fmt)}
        >
          {icon}
          {label}
        </button>
      ))}
      <p class="m-0 border-t border-slate-200 px-2 pt-1.5 text-xs text-slate-400 dark:border-slate-700">
        {labels.xlsxGap ?? "Excel = HTML .xls (Vue-compatible). Native .xlsx not bundled."}
      </p>
    </div>
  );

  const columnOverlay = () => {
    const h = hiddenCols.value;
    const defs = columns.filter((c) => c.prop !== "selection");
    return (
      <div class="flex max-h-72 min-w-40 flex-col gap-1 overflow-auto p-2">
        {defs.map((c) => (
          <Checkbox
            checked={!(h[c.prop] ?? false)}
            onChange={() => toggleColumn(c.prop)}
          >
            {c.prop === "actions" ? (props.actionLabels?.column ?? c.label) : c.label}
          </Checkbox>
        ))}
        {!defs.some((c) => c.prop === "actions") &&
          !!(props.actions?.view || props.actions?.update || props.actions?.delete || props.actions?.download) && (
          <Checkbox
            checked={!(h.actions ?? false)}
            onChange={() => toggleColumn("actions")}
          >
            {props.actionLabels?.column ?? "Actions"}
          </Checkbox>
        )}
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

  const toolGroup = (
    <ButtonGroup attached class="dp-tool-group">
      {tools.create && (props.onCreate || columns.length > 0 || (props.formSchemas?.length ?? 0) > 0) &&
        toolBtn(labels.create ?? "Add", () => {
          if (props.onCreate) props.onCreate();
          else formOpen.value = true;
        }, <IconPlus size="sm" />)}
      {hasSearchUi &&
        toolBtn(labels.search ?? searchLabels.open ?? "Search", () => {
          showSearch.value = !showSearch.value;
        }, <IconSearch size="sm" />)}
      {tools.refresh && props.onRefresh &&
        toolBtn(labels.refresh ?? "Refresh", props.onRefresh, <IconRefresh size="sm" />)}
      {tools.print &&
        toolBtn(labels.print ?? "Print", doPrint, <IconPrinter size="sm" />)}
      {tools.import &&
        toolBtn(labels.import ?? "Import", doImport, <IconUpload size="sm" />)}
      {tools.export && (
        <Dropdown overlay={exportOverlay} placement="bottomRight" trigger="click">
          <Button type="button" size="sm" class="px-2.5" aria-label={labels.export ?? "Export"}>
            <IconDownload size="sm" />
          </Button>
        </Dropdown>
      )}
      {tools.column && (columns.length > 0 || props.actions) && (
        <Dropdown overlay={columnOverlay()} placement="bottomRight" trigger="click">
          <Button type="button" size="sm" class="px-2.5" aria-label={labels.column ?? "Columns"}>
            <IconColumns size="sm" />
          </Button>
        </Dropdown>
      )}
      {tools.column && columns.length === 0 && !props.actions &&
        toolBtn(labels.column ?? "Columns", soon, <IconColumns size="sm" />)}
    </ButtonGroup>
  );

  const toolbar = (
    <div
      class={`dp-toolbar flex w-full flex-wrap items-center gap-2 ${
        props.tabs?.length ? "justify-between" : "justify-end"
      }`}
      data-testid="data-panel-toolbar"
    >
      {props.tabs && props.tabs.length > 0 && (
        <ButtonGroup attached class="dp-tab-group">
          {props.tabs.map((t) => (
            <Button
              type="button"
              size="sm"
              variant={tab.value === t.value ? "primary" : "default"}
              onClick={() => {
                tab.value = t.value;
                props.onTabChange?.(t.value);
              }}
            >
              {t.label}
            </Button>
          ))}
        </ButtonGroup>
      )}
      {toolGroup}
      {props.toolbarExtra}
    </div>
  );

  const total = props.total ?? rows.length;
  const pageSize = (() => {
    const p = props.tableProps?.pagination;
    if (p && typeof p === "object" && "pageSize" in p && typeof p.pageSize === "number") {
      return p.pageSize;
    }
    return 20;
  })();
  const from = total === 0 ? 0 : 1;
  const to = Math.min(pageSize, total);
  const summary = props.summary ??
    (labels.range ?? "第{from}-{to}条，共{total}条数据.")
      .replaceAll("{from}", String(from))
      .replaceAll("{to}", String(to))
      .replaceAll("{total}", String(total));

  const titleNode = (
    <span class="inline-flex min-w-0 items-center gap-2">
      <IconList size="sm" />
      <span class="truncate">{props.title}</span>
    </span>
  );

  const searchField = (f: DataPanelSearchField) => (
    <label class="flex w-full flex-col gap-1.5 text-sm text-slate-700 dark:text-slate-200">
      {f.label ? <span>{f.label}</span> : null}
      {f.type === "select"
        ? (
          <select
            name={f.name}
            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="">{f.placeholder ?? "—"}</option>
            {(f.options ?? []).map((o) => (
              <option value={o.value} selected={o.value === (f.defaultValue ?? "")}>
                {o.label}
              </option>
            ))}
          </select>
        )
        : (
          <Input
            name={f.name}
            type={f.type === "date" ? "date" : "text"}
            value={f.defaultValue ?? ""}
            placeholder={f.placeholder}
            class="w-full"
          />
        )}
    </label>
  );

  const searchBar = () => {
    if (!hasSearchUi || !showSearch.value) return null;
    if (props.searchSlot) {
      return (
        <div class="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          {props.searchSlot}
        </div>
      );
    }
    const schemas = props.searchSchemas ?? [];
    return (
      <form
        method="get"
        class="flex flex-col items-start gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-700"
      >
        {schemas.map((f) => searchField(f))}
        <div class="flex items-center gap-2">
          <Button type="submit" variant="primary" size="sm">
            {searchLabels.submit ?? "Search"}
          </Button>
          <Button type="reset" size="sm">
            {searchLabels.reset ?? "Reset"}
          </Button>
        </div>
      </form>
    );
  };

  const createFields = (): DataPanelFormField[] => {
    if (props.formSchemas?.length) return props.formSchemas;
    return columns
      .filter((c) => c.prop !== "idx" && c.prop !== "actions" && c.prop !== "selection")
      .map((c) => ({ name: c.prop, label: c.label }));
  };

  const ctx = makeChildrenCtx(hiddenCols.value);
  const body = (() => {
    const ch = props.children;
    if (typeof ch === "function") {
      return (ch as (c: DataPanelChildrenCtx) => unknown)(ctx);
    }
    if (ch != null) return ch;

    const acts = props.actions ?? {};
    const al = props.actionLabels ?? {};
    const h = hiddenCols.value;
    const showActs = !!(acts.view || acts.update || acts.delete || acts.download) && !h.actions;
    let cols = columns.filter((c) => c.prop !== "actions");
    if (showActs) {
      cols = [
        ...cols,
        {
          prop: "actions",
          label: al.column ?? "Actions",
          width: 120,
          render: (_v: unknown, row: T) => (
            <RowActions
              viewLabel={al.view}
              updateLabel={al.update}
              deleteLabel={al.delete}
              downloadLabel={al.download}
              confirmTitle={al.confirmDelete}
              okText={al.ok}
              cancelText={al.cancel}
              onView={acts.view && props.onView ? () => props.onView!(row) : undefined}
              onUpdate={acts.update && props.onUpdate ? () => props.onUpdate!(row) : undefined}
              onDelete={acts.delete && props.onDelete ? () => props.onDelete!(row) : undefined}
              onDownload={acts.download && props.onDownload ? () => props.onDownload!(row) : undefined}
            />
          ),
        },
      ];
    }
    return (
      <Table
        bordered
        striped
        hoverable
        size="sm"
        rowKey={props.rowKey ?? "id"}
        dataSource={rows}
        columns={toTableColumns(cols, hiddenCols.value)}
        pagination={{ pageSize: 20, total: rows.length }}
        locale={{ emptyText: props.emptyText ?? "—" }}
        {...(props.tableProps as object)}
      />
    );
  })();

  return (
    <div class="contents">
      <Card
        bordered
        size="sm"
        class={`adm-panel-card ${props.class ?? ""}`.trim()}
        headerClass="adm-card-header"
        title={titleNode}
        extra={<span class="text-sm font-normal">{summary}</span>}
        bodyClass="p-0"
        data-testid="data-panel"
      >
        <div class="flex justify-end border-b border-slate-200 px-3 py-2 dark:border-slate-700">
          {toolbar}
        </div>
        <div>{searchBar}</div>
        <div class="dp-body px-2.5 py-2.5">{body}</div>
        {props.info != null && props.info !== "" && (
          <p class="m-0 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {props.info}
          </p>
        )}
      </Card>
      <Modal
        open={formOpen}
        title={props.formTitle ?? `${labels.create ?? "Add"} ${props.title}`}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          formOpen.value = false;
        }}
        footer={
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                formOpen.value = false;
              }}
            >
              {props.actionLabels?.cancel ?? "取消"}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const el = (globalThis as {
                  document?: { getElementById: (id: string) => { requestSubmit?: () => void } | null };
                }).document?.getElementById("dp-create-form");
                el?.requestSubmit?.();
              }}
            >
              {props.actionLabels?.ok ?? "确定"}
            </Button>
          </div>
        }
        children={() => (
          <form
            id="dp-create-form"
            class="flex flex-col gap-3"
            onSubmit={(ev: Event) => {
              ev.preventDefault();
              const form = ev.currentTarget as unknown as {
                querySelectorAll: (sel: string) => {
                  length: number;
                  [index: number]: { name?: string; value?: string };
                };
              };
              const data: Record<string, string> = {};
              const nodes = form.querySelectorAll("input, select, textarea");
              for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                if (el?.name) data[el.name] = String(el.value ?? "");
              }
              if (props.onFormSubmit) props.onFormSubmit(data);
              else message.info(labels.soon ?? "Coming soon");
              formOpen.value = false;
            }}
          >
            {createFields().map((f) => (
              <label class="flex w-full flex-col gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <span>{f.label}</span>
                {f.type === "select"
                  ? (
                    <select
                      name={f.name}
                      required={f.required}
                      class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    >
                      <option value="">{f.placeholder ?? "—"}</option>
                      {(f.options ?? []).map((o) => (
                        <option value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )
                  : (
                    <Input
                      name={f.name}
                      type={f.type === "date" ? "date" : "text"}
                      placeholder={f.placeholder ?? f.label}
                      required={f.required}
                      class="w-full"
                    />
                  )}
              </label>
            ))}
          </form>
        )}
      />
    </div>
  );
}

export default DataPanel;
