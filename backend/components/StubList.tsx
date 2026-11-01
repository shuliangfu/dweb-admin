/**
 * Generic DataPanel list stub — Vue CardPanel-shaped columns/search until domain models exist.
 * Demo rows only; create/import toast "soon" — no fake API writes.
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
      else if (c.prop === "visits" || c.prop === "images") row[c.prop] = (i + 1) * 10;
      else if (
        c.prop.endsWith("At") || c.prop === "createdAt" || c.prop === "updatedAt" ||
        c.prop === "created_at" || c.prop === "updated_at"
      ) {
        row[c.prop] = "2026-11-01 10:00:00";
      } else if (c.prop === "amount" || c.prop === "balance" || c.prop === "total") {
        row[c.prop] = ((i + 1) * 100).toFixed(2);
      } else if (c.prop === "email") {
        row[c.prop] = `user${i + 1}@example.com`;
      } else if (c.prop === "mobile") {
        row[c.prop] = `1380000000${i}`;
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
  const searchSchemas = (props.page.searchFields?.length
    ? props.page.searchFields.map((f) => ({
      name: f.name,
      label: f.label[loc] ?? f.label["en-US"],
      placeholder: f.placeholder?.[loc] ?? f.placeholder?.["en-US"] ??
        (f.label[loc] ?? f.label["en-US"]),
      defaultValue: "",
    }))
    : [{ name: "keyword", placeholder: tr("crud.search"), defaultValue: "" }]);

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
      searchSchemas={searchSchemas}
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
        excel: tr("panel.excel"),
        json: tr("panel.json"),
        xml: tr("panel.xml"),
        html: tr("panel.html"),
        unsupportedFormat: tr("panel.unsupportedFormat"),
        xlsxGap: tr("panel.xlsxGap"),
      }}
      onImportRows={(rows) => {
        message.info(tr("stub.importParsed", { n: rows.length }));
      }}
      exportFilename={props.page.key.replace(/\./g, "-")}
      actions={{ view: true, update: true, delete: true }}
      actionLabels={{
        column: tr("common.actions"),
        view: tr("rbac.view"),
        update: tr("crud.edit"),
        delete: tr("crud.delete"),
      }}
      onView={() => message.info(tr("stub.soon"))}
      onUpdate={() => message.info(tr("stub.soon"))}
      onDelete={() => message.info(tr("stub.soon"))}
    />
  );
}
