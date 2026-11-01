/**
 * DataPanel — callable list "数据面板／数据展示面板" for admin pages.
 *
 * Vue reference: `/home/vue/dreamer-vue/src/components/Card/CardPanel.vue`
 * (dispatch alias: dreamer-admin). Composes `@dreamer/ui-view` only — do not
 * fork a second UI kit. Full tool/search/column parity lands in later knives;
 * this skeleton establishes the shared chrome every list page should call.
 */
import type { JSXRenderable } from "@dreamer/view";
import { Button, Card, Table, message, type TableProps } from "@dreamer/ui-view";

/** Mirrors Vue CardPanel `table.tools` flags (subset for first slice). */
export type DataPanelTools = {
  create?: boolean;
  search?: boolean;
  refresh?: boolean;
  /** Reserved — export/import/print/column toggles come later. */
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

export type DataPanelProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  /** Panel title (Vue `table.title`). */
  title: string;
  /** Optional subtitle / store info line (Vue `store.info`). */
  info?: string;
  /** Toolbar capability flags (Vue `table.tools`). */
  tools?: DataPanelTools;
  /** Row action hints for callers (Vue `table.actions`) — reserved. */
  actions?: { view?: boolean; update?: boolean; delete?: boolean };
  /** Column defs when using built-in Table; ignored if `children` provided. */
  columns?: DataPanelColumn<T>[];
  /** Row data when using built-in Table. */
  rows?: T[];
  rowKey?: string;
  /** Search form / filters slot (left of create button area). */
  searchSlot?: unknown;
  /** Extra toolbar nodes (right side). */
  toolbarExtra?: unknown;
  /** Replace built-in Table entirely (e.g. existing Admin table). */
  children?: unknown;
  onCreate?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onPrint?: () => void;
  onColumn?: () => void;
  /** Labels for skeleton tools (export/import/print/column). */
  toolLabels?: Partial<Record<"export" | "import" | "print" | "column" | "soon", string>>;
  /** Forwarded to ui-view Table when using built-in table. */
  tableProps?: Partial<TableProps<T>>;
  emptyText?: string;
  class?: string;
};

function toTableColumns<T extends Record<string, unknown>>(
  columns: DataPanelColumn<T>[],
): TableProps<T>["columns"] {
  return columns
    .filter((c) => !c.hidden)
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
  const soon = () => message.info(labels.soon ?? "Coming soon");
  const toolbar = (
    <div class="flex flex-wrap items-center gap-2">
      {props.searchSlot}
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
        <Button type="button" size="sm" onClick={props.onExport ?? soon}>
          {labels.export ?? "Export"}
        </Button>
      )}
      {tools.import && (
        <Button type="button" size="sm" onClick={props.onImport ?? soon}>
          {labels.import ?? "Import"}
        </Button>
      )}
      {tools.print && (
        <Button type="button" size="sm" onClick={props.onPrint ?? soon}>
          {labels.print ?? "Print"}
        </Button>
      )}
      {tools.column && (
        <Button type="button" size="sm" onClick={props.onColumn ?? soon}>
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

  return (
    <Card
      bordered
      size="sm"
      class={props.class}
      title={titleNode}
      extra={toolbar}
      bodyClass="pt-3"
    >
      {props.children != null ? (
        props.children
      ) : (
        <Table
          bordered
          hoverable
          size="sm"
          rowKey={props.rowKey ?? "id"}
          dataSource={rows}
          columns={toTableColumns(columns)}
          pagination={{ pageSize: 20, total: rows.length }}
          locale={{ emptyText: props.emptyText ?? "—" }}
          {...(props.tableProps as object)}
        />
      )}
    </Card>
  );
}

export default DataPanel;
