/**
 * 权限列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/rbac/permissions`。分配 Transfer 放在本页 Modal，
 * 从详情底栏「分配」打开（与金标改密 Modal 同一路绕过）。
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

interface PermissionDetail {
  item: { name: string };
  assigned: ChildEntry[];
  available: ChildEntry[];
}

const ORDER = { role: 0, permission: 1, route: 2 } as const;

function groupLabel(type: ChildEntry["type"]): string {
  if (type === "role") return "角色";
  if (type === "permission") return "权限";
  return "路由";
}

function groupTone(
  type: ChildEntry["type"],
): "primary" | "success" | "default" {
  if (type === "role") return "primary";
  if (type === "permission") return "success";
  return "default";
}

export default function PermissionsPage() {
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
    const r = await api<PermissionDetail>(
      "GET",
      `/api/rbac/permissions?name=${encodeURIComponent(name)}`,
    );
    assignLoading.value = false;
    if (!r.ok || !r.data?.item) {
      message.error(
        r.data && "message" in r.data
          ? String((r.data as { message?: string }).message ?? "") ||
            "加载分配列表失败"
          : "加载分配列表失败",
      );
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
    const r = await api(
      "POST",
      "/api/rbac/permissions/children",
      { name, add, remove },
    );
    if (!r.ok) {
      targetKeys.value = prev;
      message.error((r.data as { message?: string }).message || "保存分配失败");
      return;
    }
    message.success("已保存");
  }

  const transferItems = () =>
    [...available.value, ...assigned.value]
      .sort((a, b) =>
        ORDER[a.type] - ORDER[b.type] || a.label.localeCompare(b.label)
      )
      .map((e) => ({ key: e.key, title: e.label }));

  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "name", label: "权限名称", sortable: true },
    { prop: "description", label: "权限说明", sortable: true },
    {
      prop: "createdAt",
      label: "创建时间",
      type: "datetime",
      sortable: true,
      headerAlign: "center",
    },
    {
      type: "actions",
      width: 200,
      actions: {
        view: true,
        edit: true,
        remove: true,
      },
    },
  ];

  /** 搜索区字段 */
  const search = {
    props: [
      { prop: "name", label: "权限名称", placeholder: "请输入权限名称查询" },
      { prop: "info", label: "权限说明", placeholder: "请输入权限说明查询" },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "name",
        label: "权限名称",
        required: true,
        createOnly: true,
        rules: [
          { required: true, message: "请输入权限名称" },
          { min: 2, max: 64, message: "名称长度为 2～64 个字符" },
          { pattern: /^[^\s/]+$/, message: "名称不能包含空格或斜杠" },
        ],
      },
      { prop: "ruleName", label: "规则名" },
      {
        prop: "description",
        label: "权限说明",
        type: "textarea" as const,
        required: true,
        rules: [{ required: true, message: "请输入权限说明" }],
      },
    ],
  };

  /** 详情抽屉字段与底栏操作 */
  const view = {
    title: (row: Row) => `权限明细 · ${String(row.name ?? "")}`,
    props: [
      { prop: "name", label: "权限名称" },
      { prop: "ruleName", label: "规则名" },
      { prop: "description", label: "权限说明" },
      { prop: "createdAt", label: "创建时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
    actions: {
      assign: {
        label: "分配",
        action: (row: Row) => {
          void openAssign(row);
        },
      },
      close: true,
    },
  };

  return (
    <>
      <DataPanel
        title="权限列表"
        panelKey="permissions"
        baseRoute="/api"
        apiMode="action"
        /** POST 须带双提交 CSRF，否则中间件 403 → 面板显示 request failed */
        apiHeaders={() => csrfHeaders()}
        apiCredentials="same-origin"
        columns={columns}
        caps={{
          import: false,
          print: false,
          columns: false,
          density: false,
          fullscreen: false,
          copy: false,
        }}
        search={search}
        form={form}
        view={view}
        defaultSort={{ prop: "name", order: "asc" }}
        toolbar={{
          create: true,
          search: true,
          refresh: true,
          export: true,
        }}
        class="adm-data-panel adm-panel-card"
        pageSize={10}
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
                const type = String(item.key).split(
                  ":",
                )[0] as ChildEntry["type"];
                return (
                  <span class="flex items-center gap-2">
                    <Tag size="xs" variant={groupTone(type)}>
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
          )}
      </Modal>
    </>
  );
}
