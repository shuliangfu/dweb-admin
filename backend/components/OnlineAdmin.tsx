/** Online admin sessions list — DataPanel chrome. */
import { Table, Tag } from "@dreamer/ui-view";
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
  return (
    <DataPanel
      title={tr("online.title")}
      info={tr("online.info", { n: props.rows.length })}
      tools={{ refresh: true }}
      onRefresh={reload}
    >
      <Table
        bordered
        hoverable
        size="sm"
        rowKey="id"
        dataSource={props.rows.map((r, i) => ({ ...r, idx: i + 1 }))}
        pagination={{ pageSize: 20, total: props.rows.length }}
        locale={{ emptyText: tr("common.empty") }}
        columns={([
          { key: "idx", title: tr("rbac.index"), dataIndex: "idx", width: 60 },
          { key: "username", title: tr("users.username"), dataIndex: "username" },
          {
            key: "status",
            title: tr("common.status"),
            render: () => <Tag size="xs" variant="success">{tr("online.active")}</Tag>,
          },
          { key: "updatedAt", title: tr("online.updatedAt"), dataIndex: "updatedAt" },
          { key: "expiresAt", title: tr("online.expiresAt"), dataIndex: "expiresAt" },
        ] as never)}
      />
    </DataPanel>
  );
}
