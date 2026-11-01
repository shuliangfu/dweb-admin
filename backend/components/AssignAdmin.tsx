/**
 * Admin role assignment — Vue `/admin/assign` (CardPanel + Access Transfer).
 * Runnable path: roles → AdminUser.roleCodes (PUT /api/users/:id), shown as allow-style tags.
 * Vue allow/deny + user-direct routes are NOT in AuthItem/Child/Route + roleCodes;
 * modal keeps a disabled extensible gap panel (no fake API). Permission/route trees: ItemAdmin.
 */
import { createSignal } from "@dreamer/view";
import { Alert, Button, Modal, Tag, Transfer } from "@dreamer/ui-view";
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
    unsupportedFormat: tr("panel.unsupportedFormat"),
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
            ? r.roleCodes.map((c) => (
              <Tag size="xs" variant="success">
                <span class="mr-1 opacity-70">{tr("assign.allowAction")}</span>
                {c}
              </Tag>
            ))
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
        <div class="grid gap-4">
          <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{tr("assign.hint")}</p>

          <section class="grid gap-2">
            <h3 class="m-0 text-sm font-medium text-slate-700 dark:text-slate-200">
              {tr("assign.rolesSection")}
            </h3>
            <Transfer
              dataSource={props.roles.map((r) => ({
                key: r.name,
                title: r.description ? `${r.name} · ${r.description}` : r.name,
              }))}
              targetKeys={targetKeys}
              showSearch
              titles={[tr("rbac.available"), tr("rbac.assigned")]}
              searchPlaceholder={[tr("rbac.transferSearch"), tr("rbac.transferSearch")]}
              listStyle={{ width: 300, height: 280 }}
              onChange={(next: string[]) => {
                targetKeys.value = next;
              }}
              messages={{
                count: (n: number) => `${n}`,
                selectedSuffix: (n: number) => ` / ${n}`,
              }}
            />
          </section>

          {/* Extensible gap: Vue allow/deny + user-direct routes — no model/API; do not post. */}
          <section
            class="grid gap-2 rounded-md border border-dashed border-slate-300 p-3 opacity-70 dark:border-slate-600"
            aria-disabled="true"
          >
            <div class="flex items-center gap-2">
              <h3 class="m-0 text-sm font-medium text-slate-700 dark:text-slate-200">
                {tr("assign.gapTitle")}
              </h3>
              <Tag size="xs" variant="warning">{tr("assign.gapBadge")}</Tag>
            </div>
            <Alert type="info" message={tr("assign.gapBody")} />
            <div class="pointer-events-none select-none grid gap-2 sm:grid-cols-2">
              <label class="flex items-center gap-2 text-xs text-slate-500">
                <input type="radio" name="assign-action-gap" disabled checked />
                {tr("assign.allowAction")}
              </label>
              <label class="flex items-center gap-2 text-xs text-slate-500">
                <input type="radio" name="assign-action-gap" disabled />
                {tr("assign.denyAction")}
              </label>
              <div class="sm:col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/40">
                {tr("assign.gapBadge")} · Transfer
              </div>
            </div>
          </section>

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
