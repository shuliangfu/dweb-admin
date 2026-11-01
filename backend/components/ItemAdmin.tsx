/**
 * Role / Permission admin (Yii2 RBAC style). One component serves both pages.
 *  - list table: #, name, description, createdAt, actions (Vue role/access; ruleName stays in form/detail)
 *  - detail modal: basic info on top, Transfer (assignable ⇄ assigned, grouped Roles/Permissions/Routes) below
 *  - create / edit forms are Modals as well
 */
import { createSignal } from "@dreamer/view";
import { Button, Descriptions, FormItem, Input, Modal, Tag, Transfer } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel, type PanelInitial, refreshPanel } from "@common/components/DataPanel.tsx";

export interface ItemRow {
  name: string;
  description: string;
  ruleName: string;
  data: string;
  isSuper: boolean;
  createdAt?: string;
  updatedAt?: string;
}
interface ChildEntry {
  key: string;
  type: "role" | "permission" | "route";
  label: string;
}
interface Detail {
  item: ItemRow;
  assigned: ChildEntry[];
  available: ChildEntry[];
}
type Mode = "view" | "edit" | "create";

const ORDER = { role: 0, permission: 1, route: 2 } as const;

function fmtTs(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 19).replace("T", " ");
}

// Module-level state (one page per route, state resets on navigation).
const open = createSignal(false);
const mode = createSignal<Mode>("view");
const detail = createSignal<Detail | null>(null);
const targetKeys = createSignal<string[]>([]);
const fName = createSignal("");
const fRule = createSignal("");
const fDesc = createSignal("");
const busy = createSignal(false);

export function ItemAdmin(props: { kind: "role" | "permission"; locale: Locale; initial: PanelInitial }) {
  const tr = createT(props.locale);
  const base = props.kind === "role" ? "/api/rbac/roles" : "/api/rbac/permissions";
  const url = (name: string) => `${base}/${encodeURIComponent(name)}`;
  const isRole = props.kind === "role";
  const T = {
    list: tr(isRole ? "rbac.roleList" : "rbac.permissionList"),
    add: tr(isRole ? "rbac.roleAdd" : "rbac.permissionAdd"),
    edit: tr(isRole ? "rbac.roleEdit" : "rbac.permissionEdit"),
    view: tr(isRole ? "rbac.roleView" : "rbac.permissionView"),
  };
  const groupLabel = (t: ChildEntry["type"]) =>
    tr(t === "role" ? "rbac.groupRole" : t === "permission" ? "rbac.groupPermission" : "rbac.groupRoute");

  async function openDetail(name: string, m: Mode) {
    mode.value = m;
    detail.value = null;
    open.value = true;
    const r = await api<Detail>("GET", `${base}?name=${encodeURIComponent(name)}`);
    if (!r.ok) {
      open.value = false;
      toastResult(r, "", tr("crud.networkError"));
      return;
    }
    const d = r.data as unknown as Detail;
    fName.value = d.item.name;
    fRule.value = d.item.ruleName;
    fDesc.value = d.item.description;
    targetKeys.value = d.assigned.map((e) => e.key);
    detail.value = d;
  }

  function openCreate() {
    mode.value = "create";
    detail.value = null;
    fName.value = "";
    fRule.value = "";
    fDesc.value = "";
    open.value = true;
  }

  async function save() {
    if (busy.value) return;
    busy.value = true;
    const create = mode.value === "create";
    const r = create
      ? await api("POST", `${base}/create`, { name: fName.value, ruleName: fRule.value, description: fDesc.value })
      : await api("POST", `${url(fName.value)}/update`, { ruleName: fRule.value, description: fDesc.value });
    busy.value = false;
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) {
      open.value = false;
      await refreshPanel(props.initial.meta.key);
    }
  }

  /** Transfer onChange: diff against the previous right-hand list and persist. */
  async function onTransfer(next: string[]) {
    const prev = targetKeys.value;
    const add = next.filter((k) => !prev.includes(k));
    const remove = prev.filter((k) => !next.includes(k));
    targetKeys.value = next;
    const r = await api("POST", `${url(fName.value)}/children`, { add, remove });
    if (!toastResult(r, tr("crud.saved"), tr("crud.networkError"))) targetKeys.value = prev;
  }

  const items = (d: Detail) =>
    [...d.available, ...d.assigned]
      .sort((a, b) => ORDER[a.type] - ORDER[b.type] || a.label.localeCompare(b.label))
      .map((e) => ({ key: e.key, title: e.label }));

  const body = () => {
    const m = mode.value;
    const d = detail.value;
    if (m !== "create" && !d) return <p class="py-8 text-center text-sm opacity-70">{tr("crud.loading")}</p>;
    return (
      <div class="grid gap-5">
        <section>
          <h3 class="mb-2 text-sm font-semibold">{tr("rbac.basicInfo")}</h3>
          {m === "view" && d
            ? (
              <Descriptions
                class="adm-desc-chrome"
                bordered
                column={1}
                size="sm"
                items={[
                  { label: tr("rbac.name"), children: d.item.name },
                  { label: tr("rbac.ruleName"), children: d.item.ruleName || "-" },
                  { label: tr("rbac.description"), children: d.item.description || "-" },
                  { label: tr("common.createdAt"), children: fmtTs(d.item.createdAt) },
                  { label: tr("common.updatedAt"), children: fmtTs(d.item.updatedAt) },
                  ...(d.item.isSuper ? [{ label: tr("common.status"), children: <Tag variant="warning">{tr("rbac.superRole")}</Tag> }] : []),
                ]}
              />
            )
            : (
              <form
                class="grid gap-3"
                onSubmit={(e: Event) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <FormItem label={tr("rbac.name")} required>
                  <Input
                    value={fName}
                    placeholder={tr("rbac.namePlaceholder")}
                    readOnly={m !== "create"}
                    onInput={(e) => {
                      fName.value = (e.target as unknown as { value: string }).value;
                    }}
                  />
                </FormItem>
                <FormItem label={tr("rbac.ruleName")}>
                  <Input
                    value={fRule}
                    onInput={(e) => {
                      fRule.value = (e.target as unknown as { value: string }).value;
                    }}
                  />
                </FormItem>
                <FormItem label={tr("rbac.description")}>
                  <Input
                    value={fDesc}
                    onInput={(e) => {
                      fDesc.value = (e.target as unknown as { value: string }).value;
                    }}
                  />
                </FormItem>
                <div class="flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      open.value = false;
                    }}
                  >
                    {tr("crud.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" loading={busy.value}>
                    {tr("crud.confirm")}
                  </Button>
                </div>
              </form>
            )}
        </section>
        {m !== "create" && d
          ? (
            <section>
              <h3 class="mb-1 text-sm font-semibold">{tr("rbac.assign")}</h3>
              <p class="mb-2 text-xs opacity-70">{tr(m === "view" ? "rbac.transferViewOnly" : "rbac.transferHint")}</p>
              <Transfer
                dataSource={items(d)}
                targetKeys={targetKeys}
                disabled={m === "view"}
                showSearch
                titles={[tr("rbac.available"), tr("rbac.assigned")]}
                searchPlaceholder={[tr("rbac.transferSearch"), tr("rbac.transferSearch")]}
                listStyle={{ width: 280, height: 260 }}
                onChange={onTransfer}
                render={(item) => {
                  const type = item.key.split(":")[0] as ChildEntry["type"];
                  return (
                    <span class="flex items-center gap-2">
                      <Tag size="xs" variant={type === "route" ? "default" : type === "role" ? "primary" : "success"}>
                        {groupLabel(type)}
                      </Tag>
                      <span class="truncate">{String(item.title)}</span>
                    </span>
                  );
                }}
                messages={{
                  count: (n: number) => `${n}`,
                  selectedSuffix: (n: number) => ` / ${n}`,
                }}
              />
            </section>
          )
          : null}
      </div>
    );
  };

  return (
    <DataPanel
      initial={props.initial}
      locale={props.locale}
      onCreate={openCreate}
      onEdit={(r) => void openDetail(r.id, "edit")}
      onView={(r) => void openDetail(r.id, "view")}
    >
      <Modal
        open={open}
        title={() => (mode.value === "create" ? T.add : mode.value === "edit" ? T.edit : T.view)}
        width="xl"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
        children={body}
      />
    </DataPanel>
  );
}
