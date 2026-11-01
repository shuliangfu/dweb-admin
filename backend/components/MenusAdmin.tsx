/** Menu management (two levels). Create / edit in a Modal. */
import { createSignal } from "@dreamer/view";
import { Button, FormItem, Input, Modal, Select, Switch, Table, Tag } from "@dreamer/ui-view";
import { createT, type Locale, pickLocalized } from "@common/i18n/mod.ts";
import { api, ConfirmDelete, reload, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel, type DataPanelChildrenCtx } from "@common/components/DataPanel.tsx";

export interface MenuRow {
  key: string;
  parentKey: string;
  title: Record<string, string>;
  path: string;
  icon: string;
  sort: number;
  status: "active" | "disabled";
}

const open = createSignal(false);
const editing = createSignal(""); // "" = create
const fKey = createSignal("");
const fParent = createSignal("");
const fZh = createSignal("");
const fEn = createSignal("");
const fPath = createSignal("");
const fIcon = createSignal("menu");
const fSort = createSignal("0");
const fActive = createSignal(true);
const errors = createSignal<string[]>([]);
const deleting = createSignal("");
const busy = createSignal(false);

export function MenusAdmin(props: { locale: Locale; rows: MenuRow[] }) {
  const tr = createT(props.locale);
  const tops = props.rows.filter((m) => !m.parentKey);
  const err = (f: string) => (errors.value.includes(f) ? tr("crud.required") : undefined);

  function openForm(row?: MenuRow) {
    editing.value = row?.key ?? "";
    fKey.value = row?.key ?? "";
    fParent.value = row?.parentKey ?? "";
    fZh.value = row?.title["zh-CN"] ?? "";
    fEn.value = row?.title["en-US"] ?? "";
    fPath.value = row?.path ?? "";
    fIcon.value = row?.icon ?? "menu";
    fSort.value = String(row?.sort ?? 0);
    fActive.value = (row?.status ?? "active") === "active";
    errors.value = [];
    open.value = true;
  }

  async function save() {
    if (busy.value) return;
    busy.value = true;
    const body: Record<string, unknown> = {
      parentKey: fParent.value,
      title: { "zh-CN": fZh.value, "en-US": fEn.value },
      path: fPath.value,
      icon: fIcon.value,
      sort: Number(fSort.value) || 0,
      status: fActive.value ? "active" : "disabled",
    };
    const k = editing.value;
    if (!k) body.key = fKey.value;
    const r = k ? await api("PUT", `/api/menus/${encodeURIComponent(k)}`, body) : await api("POST", "/api/menus", body);
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
        title={tr("menus.title")}
        tools={{ create: true, refresh: true, export: true, print: true, column: true, search: true }}
        onCreate={() => openForm()}
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
          { name: "keyword", label: tr("menus.key"), placeholder: tr("menus.key"), defaultValue: "" },
        ]}
        searchLabels={{ open: tr("panel.search"), submit: tr("crud.search"), reset: tr("crud.reset") }}
        columns={[
          { prop: "idx", label: tr("rbac.index") },
          { prop: "key", label: tr("menus.key") },
          { prop: "parentKey", label: tr("menus.parent") },
          { prop: "title", label: tr("menus.titleCol") },
          { prop: "path", label: tr("menus.path") },
          { prop: "sort", label: tr("menus.sort") },
          { prop: "status", label: tr("common.status") },
          { prop: "actions", label: tr("common.actions") },
        ]}
        rows={props.rows.map((r, i) => ({
          ...r,
          idx: i + 1,
          title: typeof r.title === "object" ? (r.title["zh-CN"] ?? r.key) : r.title,
        })) as never}
      >
        {(ctx: DataPanelChildrenCtx) => (
          <Table
                  bordered
                  hoverable
                  size="sm"
                  rowKey="key"
                  dataSource={props.rows.map((r, i) => ({ ...r, idx: i + 1 }))}
                  pagination={{ pageSize: 50, total: props.rows.length }}
                  locale={{ emptyText: tr("common.empty") }}
                  columns={ctx.filterTableColumns(([
          { key: "idx", title: tr("rbac.index"), dataIndex: "idx", width: 60 },
          { key: "key", title: tr("menus.key"), dataIndex: "key" },
          { key: "parentKey", title: tr("menus.parent"), render: (_v: unknown, r: MenuRow) => r.parentKey || "-" },
          { key: "title", title: tr("menus.titleCol"), render: (_v: unknown, r: MenuRow) => pickLocalized(r.title, props.locale, r.key) },
          { key: "path", title: tr("menus.path"), render: (_v: unknown, r: MenuRow) => r.path || "-" },
          { key: "sort", title: tr("menus.sort"), dataIndex: "sort" },
          {
            key: "status",
            title: tr("common.status"),
            render: (_v: unknown, r: MenuRow) => (
              <Tag size="xs" variant={r.status === "active" ? "success" : "default"}>
                {tr(r.status === "active" ? "common.active" : "common.disabled")}
              </Tag>
            ),
          },
          {
            key: "actions",
            title: tr("common.actions"),
            render: (_v: unknown, r: MenuRow) => (
              <div class="flex items-center gap-2">
                <Button type="button" size="sm" onClick={() => openForm(r)}>{tr("crud.edit")}</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    deleting.value = r.key;
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
        title={() => tr(editing.value ? "menusForm.editTitle" : "menusForm.addTitle")}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
        children={() => (
          <div class="grid gap-3">
            <FormItem label={tr("menusForm.key")} required error={err("key")}>
              {input(fKey, { readOnly: editing.value !== "", placeholder: "rbac.admins" })}
            </FormItem>
            <FormItem label={tr("menusForm.parent")} error={err("parentKey")}>
              <Select
                value={fParent}
                options={[
                  { value: "", label: tr("menusForm.topLevel") },
                  ...tops.filter((m) => m.key !== editing.value).map((m) => ({
                    value: m.key,
                    label: pickLocalized(m.title, props.locale, m.key),
                  })),
                ]}
                onChange={(e: Event) => {
                  fParent.value = (e.target as unknown as { value: string }).value;
                }}
              />
            </FormItem>
            <FormItem label={tr("menusForm.titleZh")}>{input(fZh)}</FormItem>
            <FormItem label={tr("menusForm.titleEn")}>{input(fEn)}</FormItem>
            <FormItem label={tr("menusForm.path")}>{input(fPath, { placeholder: "/rbac/admins" })}</FormItem>
            <FormItem label={tr("menusForm.icon")}>{input(fIcon)}</FormItem>
            <FormItem label={tr("menusForm.sort")}>{input(fSort, { type: "number" })}</FormItem>
            <FormItem label={tr("common.status")}>
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
        ask={(k) => tr("crud.deleteAsk", { name: k })}
        okText={tr("crud.delete")}
        cancelText={tr("crud.cancel")}
        onConfirm={async (k) => {
          const r = await api("DELETE", `/api/menus/${encodeURIComponent(k)}`);
          if (toastResult(r, tr("crud.deleted"), tr("crud.networkError"))) reload();
        }}
      />
    </div>
  );
}
