/** Admin (user) management. Create / edit / view in Modal (never a separate page).
 * List columns follow Vue admin/index.vue: # / username / email / status / lastLogin / created / actions
 * Form: Vue avatar/lockscreen/login_count absent on AdminUser — keep nickname+roles (model); password confirm client-side.
 * Search: username / email / status (Vue schemas). */
import { createSignal } from "@dreamer/view";
import { Button, Descriptions, FormItem, Input, Modal, MultiSelect, Switch, Table, Tag } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, ConfirmDelete, reload, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel, type DataPanelChildrenCtx } from "@common/components/DataPanel.tsx";

export interface UserRow {
  id: string;
  username: string;
  nickname: string;
  email: string;
  roleCodes: string[];
  status: "active" | "disabled";
  /** ISO string from listUsers (Vue login_count absent — show last login instead). */
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

type Mode = "create" | "edit" | "view";

const open = createSignal(false);
const mode = createSignal<Mode>("create");
const editId = createSignal("");
const fUsername = createSignal("");
const fNickname = createSignal("");
const fEmail = createSignal("");
const fPassword = createSignal("");
const fPassword2 = createSignal("");
const fRoles = createSignal<string[]>([]);
const fActive = createSignal(true);
const viewRow = createSignal<UserRow | null>(null);
const errors = createSignal<string[]>([]);
const formError = createSignal("");
const deleting = createSignal("");
const names = new Map<string, string>();
const busy = createSignal(false);

function fmtTs(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 19).replace("T", " ");
}

export function AdminsAdmin(props: {
  locale: Locale;
  rows: UserRow[];
  roles: { name: string; description: string }[];
  keyword: string;
  username: string;
  email: string;
  status: string;
}) {
  const tr = createT(props.locale);
  for (const r of props.rows) names.set(r.id, r.username);
  const err = (f: string) => (errors.value.includes(f) ? tr("crud.required") : undefined);

  function openCreate() {
    mode.value = "create";
    editId.value = "";
    viewRow.value = null;
    fUsername.value = "";
    fNickname.value = "";
    fEmail.value = "";
    fPassword.value = "";
    fPassword2.value = "";
    fRoles.value = [];
    fActive.value = true;
    errors.value = [];
    formError.value = "";
    open.value = true;
  }

  function openEdit(row: UserRow) {
    mode.value = "edit";
    editId.value = row.id;
    viewRow.value = row;
    fUsername.value = row.username;
    fNickname.value = row.nickname ?? "";
    fEmail.value = row.email ?? "";
    fPassword.value = "";
    fPassword2.value = "";
    fRoles.value = row.roleCodes ?? [];
    fActive.value = row.status === "active";
    errors.value = [];
    formError.value = "";
    open.value = true;
  }

  function openView(row: UserRow) {
    mode.value = "view";
    editId.value = row.id;
    viewRow.value = row;
    errors.value = [];
    formError.value = "";
    open.value = true;
  }

  async function save() {
    if (busy.value || mode.value === "view") return;
    const id = editId.value;
    const needPwd = !id;
    if (needPwd && !fPassword.value) {
      errors.value = ["password"];
      formError.value = tr("usersForm.passwordRequired");
      return;
    }
    if (fPassword.value || fPassword2.value) {
      if (fPassword.value !== fPassword2.value) {
        errors.value = ["password", "password2"];
        formError.value = tr("usersForm.passwordMismatch");
        return;
      }
    }
    if (!fEmail.value.trim()) {
      errors.value = ["email"];
      formError.value = tr("crud.required");
      return;
    }
    busy.value = true;
    formError.value = "";
    const body: Record<string, unknown> = {
      nickname: fNickname.value,
      email: fEmail.value.trim(),
      roleCodes: fRoles.value,
      status: fActive.value ? "active" : "disabled",
    };
    if (fPassword.value) body.password = fPassword.value;
    if (!id) body.username = fUsername.value;
    const r = id ? await api("POST", `/api/users/${id}/update`, body) : await api("POST", "/api/users/create", body);
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

  return (
    <div>
      <DataPanel
        title={tr("nav.admins")}
        tools={{ create: true, search: true, refresh: true, export: true, print: true, column: true }}
        onCreate={openCreate}
        onRefresh={reload}
        toolLabels={toolLabels}
        searchSchemas={[
          {
            name: "username",
            label: tr("users.username"),
            placeholder: tr("usersForm.username"),
            defaultValue: props.username,
          },
          {
            name: "email",
            label: tr("usersForm.email"),
            placeholder: tr("usersForm.email"),
            defaultValue: props.email,
          },
          {
            name: "status",
            label: tr("usersForm.status"),
            type: "select",
            defaultValue: props.status,
            options: [
              { value: "", label: tr("common.all") },
              { value: "active", label: tr("common.active") },
              { value: "disabled", label: tr("common.disabled") },
            ],
          },
        ]}
        searchLabels={{ open: tr("panel.search"), submit: tr("crud.search"), reset: tr("crud.reset") }}
        columns={[
          { prop: "idx", label: tr("rbac.index") },
          { prop: "username", label: tr("users.username") },
          { prop: "email", label: tr("usersForm.email") },
          { prop: "status", label: tr("common.status") },
          { prop: "lastLoginAt", label: tr("users.lastLogin") },
          { prop: "createdAt", label: tr("common.createdAt") },
          { prop: "actions", label: tr("common.actions") },
        ]}
        rows={props.rows.map((r, i) => ({ ...r, idx: i + 1 })) as never}
      >
        {(ctx: DataPanelChildrenCtx) => (
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
              { key: "email", title: tr("usersForm.email"), dataIndex: "email" },
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
                key: "lastLoginAt",
                title: tr("users.lastLogin"),
                render: (_v: unknown, r: UserRow) => fmtTs(r.lastLoginAt),
              },
              {
                key: "createdAt",
                title: tr("common.createdAt"),
                render: (_v: unknown, r: UserRow) => fmtTs(r.createdAt),
              },
              {
                key: "actions",
                title: tr("common.actions"),
                render: (_v: unknown, r: UserRow) => (
                  <div class="flex items-center gap-2">
                    <Button type="button" size="sm" onClick={() => openView(r)}>{tr("rbac.view")}</Button>
                    <Button type="button" size="sm" onClick={() => openEdit(r)}>{tr("crud.edit")}</Button>
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
        title={() =>
          mode.value === "view"
            ? tr("usersForm.viewTitle")
            : tr(editId.value ? "usersForm.editTitle" : "usersForm.addTitle")
        }
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
        children={() => {
          if (mode.value === "view") {
            const r = viewRow.value;
            if (!r) return <p class="py-6 text-center text-sm opacity-70">{tr("crud.loading")}</p>;
            return (
              <Descriptions
                class="adm-desc-chrome"
                bordered
                column={1}
                size="sm"
                items={[
                  { label: tr("usersForm.username"), children: r.username },
                  { label: tr("usersForm.nickname"), children: r.nickname || "—" },
                  { label: tr("usersForm.email"), children: r.email || "—" },
                  {
                    label: tr("usersForm.status"),
                    children: (
                      <Tag size="xs" variant={r.status === "active" ? "success" : "default"}>
                        {tr(r.status === "active" ? "common.active" : "common.disabled")}
                      </Tag>
                    ),
                  },
                  {
                    label: tr("usersForm.role"),
                    children: (r.roleCodes ?? []).length ? r.roleCodes.join(", ") : "—",
                  },
                  { label: tr("users.lastLogin"), children: fmtTs(r.lastLoginAt) },
                  { label: tr("common.createdAt"), children: fmtTs(r.createdAt) },
                  { label: tr("common.updatedAt"), children: fmtTs(r.updatedAt) },
                ]}
              />
            );
          }
          return (
            <div class="grid gap-3">
              <FormItem label={tr("usersForm.username")} required error={err("username")}>
                {input(fUsername, { readOnly: editId.value !== "", autoComplete: "off" })}
              </FormItem>
              <FormItem label={tr("usersForm.nickname")}>{input(fNickname)}</FormItem>
              <FormItem label={tr("usersForm.email")} required error={err("email")}>{input(fEmail)}</FormItem>
              <FormItem
                label={tr("usersForm.password")}
                required={editId.value === ""}
                error={err("password")}
              >
                {input(fPassword, {
                  type: "password",
                  autoComplete: "new-password",
                  placeholder: editId.value ? tr("usersForm.passwordKeep") : "",
                })}
              </FormItem>
              <FormItem label={tr("usersForm.passwordConfirm")} error={err("password2")}>
                {input(fPassword2, {
                  type: "password",
                  autoComplete: "new-password",
                  placeholder: editId.value ? tr("usersForm.passwordKeep") : tr("usersForm.passwordConfirm"),
                })}
              </FormItem>
              <FormItem label={tr("usersForm.role")}>
                <MultiSelect
                  value={fRoles}
                  options={props.roles.map((r) => ({
                    value: r.name,
                    label: r.description ? `${r.name} · ${r.description}` : r.name,
                  }))}
                  onChange={() => {}}
                />
              </FormItem>
              <FormItem label={tr("usersForm.status")}>
                <Switch checked={fActive} />
              </FormItem>
              {() => formError.value
                ? <p class="m-0 text-sm text-red-600 dark:text-red-400">{formError.value}</p>
                : null}
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
          );
        }}
      />

      <ConfirmDelete
        target={deleting}
        title={tr("crud.deleteTitle")}
        ask={(id) => tr("crud.deleteAsk", { name: names.get(id) ?? id })}
        okText={tr("crud.delete")}
        cancelText={tr("crud.cancel")}
        onConfirm={async (id) => {
          const r = await api("POST", `/api/users/${id}/remove`);
          if (toastResult(r, tr("crud.deleted"), tr("crud.networkError"))) reload();
        }}
      />
    </div>
  );
}
