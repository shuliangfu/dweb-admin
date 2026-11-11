/**
 * Role list — gold-standard DataPanel (same shape as `rbac/admins/index.tsx`).
 * Action API at `/api/rbac/roles`. Assign Transfer lives in a page Modal,
 * opened from the view footer (same bypass as the gold password Modal).
 */
import { createSignal } from "@dreamer/view";
import {
  type Column,
  DataPanel,
  message,
  Modal,
  type Row,
  Tag,
  Transfer,
} from "@dreamer/ui-view";
import { api, csrfHeaders } from "@common/utils/client-api.ts";

interface ChildEntry {
  key: string;
  type: "role" | "permission" | "route";
  label: string;
}

interface RoleDetail {
  item: { name: string };
  assigned: ChildEntry[];
  available: ChildEntry[];
}

const ORDER = { role: 0, permission: 1, route: 2 } as const;

const columns: Column[] = [
  { type: "selection" },
  { type: "index", label: "#" },
  { prop: "name", label: "角色名称", sortable: true },
  { prop: "description", label: "角色说明", sortable: true },
  { prop: "createdAt", label: "创建时间", type: "datetime", sortable: true, headerAlign: "center" },
  { type: "actions", width: 200, actions: [{ name: "view" }, { name: "edit" }, { name: "remove" }] },
];

const search = [
  { prop: "name", label: "角色名称", placeholder: "请输入角色名称查询" },
  { prop: "info", label: "角色说明", placeholder: "请输入角色说明查询" },
];

const form = [
  {
    prop: "name",
    label: "角色名称",
    required: true,
    createOnly: true,
    rules: [
      { required: true, message: "请输入角色名称" },
      { min: 2, max: 64, message: "名称长度为 2～64 个字符" },
      { pattern: /^[^\s/]+$/, message: "名称不能包含空格或斜杠" },
    ],
  },
  { prop: "ruleName", label: "规则名" },
  {
    prop: "description",
    label: "角色说明",
    type: "textarea" as const,
    required: true,
    rules: [{ required: true, message: "请输入角色说明" }],
  },
];

const viewProps = [
  { prop: "name", label: "角色名称" },
  { prop: "ruleName", label: "规则名" },
  { prop: "description", label: "角色说明" },
  { prop: "createdAt", label: "创建时间" },
  { prop: "updatedAt", label: "更新时间" },
];

function groupLabel(type: ChildEntry["type"]): string {
  if (type === "role") return "角色";
  if (type === "permission") return "权限";
  return "路由";
}

function groupTone(type: ChildEntry["type"]): "primary" | "success" | "default" {
  if (type === "role") return "primary";
  if (type === "permission") return "success";
  return "default";
}

export default function RolesPage() {
  const assignOpen = createSignal(false);
  const assignName = createSignal("");
  const assignLoading = createSignal(false);
  const available = createSignal<ChildEntry[]>([]);
  const assigned = createSignal<ChildEntry[]>([]);
  const targetKeys = createSignal<string[]>([]);

  async function openAssign(row: Row) {
    const name = String(row.name ?? row.id ?? "");
    if (!name) return;
    assignName.value = name;
    assignLoading.value = true;
    assigned.value = [];
    available.value = [];
    targetKeys.value = [];
    assignOpen.value = true;
    const r = await api<RoleDetail>("GET", `/api/rbac/roles?name=${encodeURIComponent(name)}`);
    assignLoading.value = false;
    if (!r.ok || !r.data?.item) {
      message.error(r.data && "message" in r.data ? String((r.data as { message?: string }).message ?? "") || "加载分配列表失败" : "加载分配列表失败");
      assignOpen.value = false;
      return;
    }
    const d = r.data;
    assigned.value = d.assigned ?? [];
    available.value = d.available ?? [];
    targetKeys.value = (d.assigned ?? []).map((e) => e.key);
  }

  async function onTransfer(next: string[]) {
    const prev = targetKeys.value;
    const add = next.filter((k) => !prev.includes(k));
    const remove = prev.filter((k) => !next.includes(k));
    targetKeys.value = next;
    const name = assignName.value;
    const r = await api("POST", `/api/rbac/roles/${encodeURIComponent(name)}/children`, { add, remove });
    if (!r.ok) {
      targetKeys.value = prev;
      message.error((r.data as { message?: string }).message || "保存分配失败");
      return;
    }
    message.success("已保存");
  }

  const transferItems = () =>
    [...available.value, ...assigned.value]
      .sort((a, b) => ORDER[a.type] - ORDER[b.type] || a.label.localeCompare(b.label))
      .map((e) => ({ key: e.key, title: e.label }));

  return (
    <>
      <DataPanel
        title="角色列表"
        panelKey="roles"
        baseRoute="/api/rbac/roles"
        apiMode="action"
        apiHeaders={() => csrfHeaders()}
        apiCredentials="same-origin"
        columns={columns}
        search={search}
        form={form}
        view={{
          title: (row: Row) => `角色明细 · ${String(row.name ?? "")}`,
          props: viewProps,
          actions: {
            assign: {
              label: "分配",
              action: (row: Row) => {
                void openAssign(row);
              },
            },
            close: true,
          },
        }}
        toolbar={{ create: true, search: true, refresh: true, export: true }}
        caps={{ import: false, print: false, columns: false, density: false, fullscreen: false, copy: false }}
        defaultSort={{ prop: "name", order: "asc" }}
        pageSize={10}
        class="adm-data-panel adm-panel-card"
      />
      <Modal
        open={assignOpen}
        title={() => `${assignName.value}-分配权限`}
        width="xl"
        keyboard
        destroyOnClose
        onClose={() => {
          assignOpen.value = false;
        }}
      >
        {assignLoading.value
          ? <p class="py-8 text-center text-sm opacity-70">加载中…</p>
          : (
            <Transfer
              dataSource={transferItems()}
              targetKeys={targetKeys}
              showSearch
              titles={["可分配", "已分配"]}
              searchPlaceholder={["搜索", "搜索"]}
              listStyle={{ width: 280, height: 260 }}
              onChange={onTransfer}
              render={(item) => {
                const type = String(item.key).split(":")[0] as ChildEntry["type"];
                return (
                  <span class="flex items-center gap-2">
                    <Tag size="xs" variant={groupTone(type)}>{groupLabel(type)}</Tag>
                    <span class="truncate">{String(item.title)}</span>
                  </span>
                );
              }}
              messages={{
                count: (n: number) => `${n}`,
                selectedSuffix: (n: number) => ` / ${n}`,
              }}
            />
          )}
      </Modal>
    </>
  );
}
