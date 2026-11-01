/**
 * Generic DataPanel list stub — demo rows until domain models exist.
 */
import { Tag, message } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { reload } from "@backend/components/crud-kit.tsx";
import { DataPanel } from "@common/components/DataPanel.tsx";
import type { StubPage } from "@common/stubs/catalog.ts";

function demoRows(page: StubPage, n = 3): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const row: Record<string, unknown> = { id: String(i + 1), idx: i + 1 };
    for (const c of page.columns) {
      if (c.prop === "status") row[c.prop] = i % 2 === 0 ? "active" : "pending";
      else if (c.prop.endsWith("At") || c.prop === "createdAt" || c.prop === "updatedAt") {
        row[c.prop] = "2026-11-01 10:00:00";
      } else if (c.prop === "amount" || c.prop === "balance" || c.prop === "total") {
        row[c.prop] = ((i + 1) * 100).toFixed(2);
      } else {
        row[c.prop] = `${c.label["en-US"]} #${i + 1}`;
      }
    }
    return row;
  });
}

export function StubList(props: { locale: Locale; page: StubPage }) {
  const tr = createT(props.locale);
  const loc = props.locale;
  const rows = demoRows(props.page);
  const columns = [
    { prop: "idx", label: "#" },
    ...props.page.columns.map((c) => ({
      prop: c.prop,
      label: c.label[loc] ?? c.label["en-US"],
      render: c.prop === "status"
        ? (value: unknown) => (
          <Tag size="xs" variant={value === "active" ? "success" : "warning"}>
            {String(value)}
          </Tag>
        )
        : undefined,
    })),
  ];
  return (
    <DataPanel
      title={props.page.title[loc] ?? props.page.title["en-US"]}
      info={`${tr("stub.demoInfo", { n: rows.length })} · ${tr("stub.authNote")}`}
      tools={{ create: true, refresh: true, export: true, import: true, print: true, column: true, search: true }}
      onCreate={() => message.info(tr("stub.soon"))}
      onRefresh={reload}
      columns={columns as never}
      rows={rows as never}
      rowKey="id"
      emptyText={tr("common.empty")}
      searchSchemas={[
        { name: "keyword", placeholder: tr("crud.search"), defaultValue: "" },
      ]}
      searchLabels={{ open: tr("panel.search"), submit: tr("crud.search"), reset: tr("crud.reset") }}
      toolLabels={{
        export: tr("panel.export"),
        import: tr("panel.import"),
        print: tr("panel.print"),
        column: tr("panel.column"),
        search: tr("panel.search"),
        soon: tr("stub.soon"),
        resetColumns: tr("panel.resetColumns"),
        csv: "CSV",
        excel: "Excel",
        xml: "XML",
        html: "HTML",
      }}
    />
  );
}
