/** Online admin sessions list — DataPanel chrome; real AdminSession rows + kick. */
import { createSignal } from "@dreamer/view";
import { Button, Tag } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, ConfirmDelete, reload, toastResult } from "@backend/components/crud-kit.tsx";
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

export function OnlineAdmin(props: { locale: Locale; rows: OnlineRow[]; keyword?: string }) {
  const tr = createT(props.locale);
  const deleting = createSignal("");
  const rows = props.rows.map((r, i) => ({ ...r, idx: i + 1 }));
  const names = new Map(props.rows.map((r) => [r.id, r.username]));

  return (
    <div>
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
            defaultValue: props.keyword ?? "",
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
          { prop: "ip", label: tr("online.ip") },
          {
            prop: "userAgent",
            label: tr("online.ua"),
            render: (_v: unknown, r: OnlineRow) => (
              <span class="block max-w-72 truncate text-xs" title={r.userAgent}>{r.userAgent}</span>
            ),
          },
          { prop: "updatedAt", label: tr("online.updatedAt") },
          { prop: "expiresAt", label: tr("online.expiresAt") },
          {
            prop: "actions",
            label: tr("common.actions"),
            render: (_v: unknown, r: OnlineRow) => (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => {
                  deleting.value = r.id;
                }}
              >
                {tr("online.kick")}
              </Button>
            ),
          },
        ]}
        rows={rows as never}
        rowKey="id"
        emptyText={tr("common.empty")}
      />

      <ConfirmDelete
        target={deleting}
        title={tr("online.kickTitle")}
        ask={(id) => tr("online.kickAsk", { name: names.get(id) ?? id })}
        okText={tr("online.kick")}
        cancelText={tr("crud.cancel")}
        onConfirm={async (id) => {
          const r = await api("POST", `/api/sessions/${id}/remove`);
          if (toastResult(r, tr("online.kicked"), tr("crud.networkError"))) reload();
        }}
      />
    </div>
  );
}
