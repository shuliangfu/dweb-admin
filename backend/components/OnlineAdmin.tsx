/** Online admin sessions list — DataPanel chrome; real AdminSession rows. */
import { Tag } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { reload } from "@backend/components/crud-kit.tsx";
import { DataPanel } from "@common/components/DataPanel.tsx";

export type OnlineRow = {
  id: string;
  username: string;
  nickname: string;
  ip: string;
  userAgent: string;
  updatedAt: string;
  expiresAt?: string;
};

export function OnlineAdmin(props: { locale: Locale; rows: OnlineRow[] }) {
  const tr = createT(props.locale);
  const rows = props.rows.map((r, i) => ({ ...r, idx: i + 1 }));
  return (
    <DataPanel
      title={tr("online.title")}
      info={tr("online.info", { n: props.rows.length })}
      tools={{ refresh: true, export: true, print: true, column: true, search: true }}
      onRefresh={reload}
      toolLabels={{
        export: tr("panel.export"),
        print: tr("panel.print"),
        column: tr("panel.column"),
        search: tr("panel.search"),
        soon: tr("panel.soon"),
        resetColumns: tr("panel.resetColumns"),
        csv: "CSV",
      }}
      searchSchemas={[
        {
          name: "keyword",
          label: tr("users.username"),
          placeholder: tr("usersForm.searchPlaceholder"),
        },
      ]}
      searchLabels={{ open: tr("panel.search"), submit: tr("crud.search"), reset: tr("crud.reset") }}
      columns={[
        { prop: "idx", label: tr("rbac.index"), width: 60 },
        { prop: "username", label: tr("users.username") },
        {
          prop: "status",
          label: tr("common.status"),
          render: () => <Tag size="xs" variant="success">{tr("online.active")}</Tag>,
        },
        { prop: "updatedAt", label: tr("online.updatedAt") },
        { prop: "expiresAt", label: tr("online.expiresAt") },
      ]}
      rows={rows as never}
      rowKey="id"
      emptyText={tr("common.empty")}
    />
  );
}
