/**
 * Admin role assignment — Vue `/admin/assign` (CardPanel + Access Transfer).
 * dweb model assigns roles via AdminUser.roleCodes (PUT /api/users/:id).
 * Allow/deny + direct route grants on a user are not in the Yii2-style graph yet;
 * role ↔ permission ↔ route stays on ItemAdmin.
 */
import { createSignal } from "@dreamer/view";
import { Button, Modal, Tag, Transfer } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, reload, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel } from "@common/components/DataPanel.tsx";

export type AssignUserRow = {
  id: string;
  username: string;
  nickname: string;
  email: string;
  roleCodes: string[];
  status: "active" | "disabled";
};

export type AssignRoleOpt = { name: string; description: string };

const open = createSignal(false);
const current = createSignal<AssignUserRow | null>(null);
const targetKeys = createSignal<string[]>([]);
const busy = createSignal(false);

export function AssignAdmin(props: {
  locale: Locale;
  rows: AssignUserRow[];
  roles: AssignRoleOpt[];
  keyword: string;
  email: string;
}) {
  const tr = createT(props.locale);

  function openAssign(row: AssignUserRow) {
    current.value = row;
    targetKeys.value = [...row.roleCodes];
    open.value = true;
  }

  async function save() {
    const row = current.value;
    if (!row || busy.value) return;
    busy.value = true;
    const r = await api("PUT", `/api/users/${row.id}`, { roleCodes: targetKeys.value });
    busy.value = false;
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) {
      open.value = false;
      reload();
    }
  }

  const toolLabels = {
    export: tr("panel.export"),
    import: tr("panel.import"),
    print: tr("panel.print"),
    column: tr("panel.column"),
    search: tr("panel.search"),
    soon: tr("panel.soon"),
    resetColumns: tr("panel.resetColumns"),
    csv: "CSV",
    excel: "Excel",
    xml: "XML",
    html: "HTML",
  };

  const columns = [
    { prop: "idx", label: tr("rbac.index"), width: 60 },
    { prop: "username", label: tr("users.username") },
    { prop: "nickname", label: tr("users.nickname") },
    { prop: "email", label: tr("usersForm.email") },
    {
      prop: "roles",
      label: tr("users.roles"),
      render: (_v: unknown, r: AssignUserRow & { idx: number }) => (
        <span class="flex flex-wrap gap-1">
          {(r.roleCodes ?? []).length
            ? r.roleCodes.map((c) => <Tag size="xs" variant="primary">{c}</Tag>)
            : <span class="text-xs text-slate-400">—</span>}
        </span>
      ),
    },
    {
      prop: "status",
      label: tr("common.status"),
      render: (_v: unknown, r: AssignUserRow) => (
        <Tag size="xs" variant={r.status === "active" ? "success" : "default"}>
          {tr(r.status === "active" ? "common.active" : "common.disabled")}
        </Tag>
      ),
    },
    {
      prop: "actions",
      label: tr("common.actions"),
      render: (_v: unknown, r: AssignUserRow) => (
        <Button type="button" size="sm" onClick={() => openAssign(r)}>
          {tr("rbac.assign")}
        </Button>
      ),
    },
  ];

  const tableRows = props.rows.map((r, i) => ({ ...r, idx: i + 1 }));

  return (
    <div>
      <DataPanel
        title={tr("nav.assign")}
        info={tr("assign.info", { n: props.rows.length })}
        tools={{ search: true, refresh: true, export: true, print: true, column: true }}
        onRefresh={reload}
        toolLabels={toolLabels}
        searchLabels={{
          open: tr("panel.search"),
          submit: tr("crud.search"),
          reset: tr("crud.reset"),
        }}
        searchSchemas={[
          {
            name: "keyword",
            label: tr("users.username"),
            placeholder: tr("usersForm.searchPlaceholder"),
            defaultValue: props.keyword,
          },
          {
            name: "email",
            label: tr("usersForm.email"),
            placeholder: tr("usersForm.email"),
            defaultValue: props.email,
          },
        ]}
        columns={columns as never}
        rows={tableRows as never}
        rowKey="id"
        emptyText={tr("common.empty")}
      />

      <Modal
        open={open}
        title={() =>
          tr("assign.modalTitle", { name: current.value?.username ?? "" })
        }
        width="xl"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
      >
        <div class="grid gap-3">
          <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{tr("assign.hint")}</p>
          <Transfer
            dataSource={props.roles.map((r) => ({
              key: r.name,
              title: r.description ? `${r.name} · ${r.description}` : r.name,
            }))}
            targetKeys={targetKeys}
            showSearch
            titles={[tr("rbac.available"), tr("rbac.assigned")]}
            searchPlaceholder={[tr("rbac.transferSearch"), tr("rbac.transferSearch")]}
            listStyle={{ width: 300, height: 320 }}
            onChange={(next: string[]) => {
              targetKeys.value = next;
            }}
            messages={{
              count: (n: number) => `${n}`,
              selectedSuffix: (n: number) => ` / ${n}`,
            }}
          />
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                open.value = false;
              }}
            >
              {tr("crud.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                void save();
              }}
            >
              {tr("crud.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
