/** Admin (user) management. Create / edit happen in a Modal (never a separate page). */
import { createSignal } from "@dreamer/view";
import { Button, FormItem, Input, Modal, MultiSelect, Switch, Table, Tag } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, ConfirmDelete, reload, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel } from "@common/components/DataPanel.tsx";

export interface UserRow {
  id: string;
  username: string;
  nickname: string;
  email: string;
  roleCodes: string[];
  status: "active" | "disabled";
}

const open = createSignal(false);
const editId = createSignal(""); // "" = create
const fUsername = createSignal("");
const fNickname = createSignal("");
const fEmail = createSignal("");
const fPassword = createSignal("");
const fRoles = createSignal<string[]>([]);
const fActive = createSignal(true);
const errors = createSignal<string[]>([]);
const deleting = createSignal("");
const names = new Map<string, string>(); // id → username for the confirm text
const busy = createSignal(false);

export function AdminsAdmin(props: {
  locale: Locale;
  rows: UserRow[];
  roles: { name: string; description: string }[];
  keyword: string;
}) {
  const tr = createT(props.locale);
  for (const r of props.rows) names.set(r.id, r.username);
  const err = (f: string) => (errors.value.includes(f) ? tr("crud.required") : undefined);

  function openForm(row?: UserRow) {
    editId.value = row?.id ?? "";
    fUsername.value = row?.username ?? "";
    fNickname.value = row?.nickname ?? "";
    fEmail.value = row?.email ?? "";
    fPassword.value = "";
    fRoles.value = row?.roleCodes ?? [];
    fActive.value = (row?.status ?? "active") === "active";
    errors.value = [];
    open.value = true;
  }

  async function save() {
    if (busy.value) return;
    busy.value = true;
    const id = editId.value;
    const body: Record<string, unknown> = {
      nickname: fNickname.value,
      email: fEmail.value,
      roleCodes: fRoles.value,
      status: fActive.value ? "active" : "disabled",
    };
    if (fPassword.value) body.password = fPassword.value;
    if (!id) body.username = fUsername.value;
    const r = id ? await api("PUT", `/api/users/${id}`, body) : await api("POST", "/api/users", body);
    busy.value = false;
    if (!r.ok) errors.value = r.data.fields ?? [];
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) reload();
  }

  const input = (sig: ReturnType<typeof createSignal<string>>, extra: Record<string, unknown> = {}) => (
    <Input
      value={sig}
      onInput={(e: Event) => {
        sig.value = (e.target as unknown as { value: string }).value;
      }}
      {...extra}
    />
  );

  return (
    <div>
      <DataPanel
        title={tr("nav.admins")}
        tools={{ create: true, search: true, refresh: true, export: true, print: true, column: true }}
        onCreate={() => openForm()}
        onRefresh={reload}
        toolLabels={{
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
        }}
        columns={[
          { prop: "idx", label: tr("rbac.index") },
          { prop: "username", label: tr("users.username") },
          { prop: "nickname", label: tr("users.nickname") },
          { prop: "email", label: tr("usersForm.email") },
          { prop: "roles", label: tr("users.roles") },
          { prop: "status", label: tr("common.status") },
          { prop: "actions", label: tr("common.actions") },
        ]}
        rows={props.rows.map((r, i) => ({
          ...r,
          idx: i + 1,
          roles: r.roleCodes.join(", "),
        })) as never}
        searchSlot={
          <form method="get" class="m-0 flex items-center gap-2">
            <Input name="keyword" value={props.keyword} placeholder={tr("usersForm.searchPlaceholder")} class="w-64" />
            <Button type="submit">{tr("crud.search")}</Button>
          </form>
        }
      >
        {(ctx) => (
          <Table
                  bordered
                  hoverable
                  size="sm"
                  rowKey="id"
                  dataSource={props.rows.map((r, i) => ({ ...r, idx: i + 1 }))}
                  pagination={{ pageSize: 20, total: props.rows.length }}
                  locale={{ emptyText: tr("common.empty") }}
                  columns={ctx.filterTableColumns(([
          { key: "idx", title: tr("rbac.index"), dataIndex: "idx", width: 60 },
          { key: "username", title: tr("users.username"), dataIndex: "username" },
          { key: "nickname", title: tr("users.nickname"), dataIndex: "nickname" },
          { key: "email", title: tr("usersForm.email"), dataIndex: "email" },
          {
            key: "roles",
            title: tr("users.roles"),
            render: (_v: unknown, r: UserRow) => (
              <span class="flex flex-wrap gap-1">
                {r.roleCodes.map((c) => <Tag size="xs" variant="primary">{c}</Tag>)}
              </span>
            ),
          },
          {
            key: "status",
            title: tr("common.status"),
            render: (_v: unknown, r: UserRow) => (
              <Tag size="xs" variant={r.status === "active" ? "success" : "default"}>
                {tr(r.status === "active" ? "common.active" : "common.disabled")}
              </Tag>
            ),
          },
          {
            key: "actions",
            title: tr("common.actions"),
            render: (_v: unknown, r: UserRow) => (
              <div class="flex items-center gap-2">
                <Button type="button" size="sm" onClick={() => openForm(r)}>{tr("crud.edit")}</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    deleting.value = r.id;
                  }}
                >
                  {tr("crud.delete")}
                </Button>
              </div>
            ),
          },
                  ] as never))}
                />
        )}
      </DataPanel>

      <Modal
        open={open}
        title={() => tr(editId.value ? "usersForm.editTitle" : "usersForm.addTitle")}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
        children={() => (
          <div class="grid gap-3">
            <FormItem label={tr("usersForm.username")} required error={err("username")}>
              {input(fUsername, { readOnly: editId.value !== "", autoComplete: "off" })}
            </FormItem>
            <FormItem label={tr("usersForm.nickname")}>{input(fNickname)}</FormItem>
            <FormItem label={tr("usersForm.email")} error={err("email")}>{input(fEmail)}</FormItem>
            <FormItem label={tr("usersForm.password")} required={editId.value === ""} error={err("password")}>
              {input(fPassword, {
                type: "password",
                autoComplete: "new-password",
                placeholder: editId.value ? tr("usersForm.passwordKeep") : "",
              })}
            </FormItem>
            <FormItem label={tr("usersForm.role")}>
              <MultiSelect
                value={fRoles}
                options={props.roles.map((r) => ({ value: r.name, label: r.description ? `${r.name} · ${r.description}` : r.name }))}
                onChange={() => {}}
              />
            </FormItem>
            <FormItem label={tr("usersForm.status")}>
              <Switch checked={fActive} />
            </FormItem>
            <div class="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => {
                  open.value = false;
                }}
              >
                {tr("crud.cancel")}
              </Button>
              <Button type="button" variant="primary" onClick={save}>{tr("crud.confirm")}</Button>
            </div>
          </div>
        )}
      />

      <ConfirmDelete
        target={deleting}
        title={tr("crud.deleteTitle")}
        ask={(id) => tr("crud.deleteAsk", { name: names.get(id) ?? id })}
        okText={tr("crud.delete")}
        cancelText={tr("crud.cancel")}
        onConfirm={async (id) => {
          const r = await api("DELETE", `/api/users/${id}`);
          if (toastResult(r, tr("crud.deleted"), tr("crud.networkError"))) reload();
        }}
      />
    </div>
  );
}
