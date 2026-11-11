/**
 * 权限分配：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/rbac/assign`。分配 Transfer 放在本页 Modal，
 * 从行操作或详情底栏「分配」打开（与权限页同一路绕过）。
 */
import { createSignal } from "@dreamer/view";
import {
  Button,
  type Column,
  DataPanel,
  message,
  Modal,
  refreshDataPanel,
  type Row,
  Tag,
  Transfer,
} from "@dreamer/ui-view";
import { api, csrfHeaders } from "@common/utils/client-api.ts";

interface RoleOpt {
  name: string;
  description: string;
}

const STATUS = [
  { value: "active", label: "启用" },
  { value: "disabled", label: "禁用" },
];

export default function AssignPage() {
  const assignOpen = createSignal(false);
  const assignRow = createSignal<Row | null>(null);
  const assignLoading = createSignal(false);
  const roles = createSignal<RoleOpt[]>([]);
  const targetKeys = createSignal<string[]>([]);
  const busy = createSignal(false);

  async function openAssign(row: Row) {
    assignRow.value = row;
    targetKeys.value = [...((row.roleCodes as string[]) ?? [])];
    roles.value = [];
    assignLoading.value = true;
    assignOpen.value = true;
    const r = await api<{ roles: RoleOpt[] }>("GET", "/api/rbac/assign/roles");
    assignLoading.value = false;
    if (!r.ok) {
      message.error("加载角色列表失败");
      assignOpen.value = false;
      return;
    }
    roles.value = r.data?.roles ?? [];
  }

  async function save() {
    const row = assignRow.value;
    if (!row || busy.value) return;
    busy.value = true;
    const r = await api("POST", "/api/rbac/assign/update", {
      id: row.id,
      roleCodes: targetKeys.value,
    });
    busy.value = false;
    if (!r.ok) {
      message.error(
        (r.data as { message?: string })?.message || "保存分配失败",
      );
      return;
    }
    message.success("已保存");
    assignOpen.value = false;
    await refreshDataPanel("assign");
  }

  function renderRoleCodes(row: Row) {
    const codes = (row.roleCodes as string[]) ?? [];
    if (!codes.length) {
      return <span class="text-xs text-slate-400">—</span>;
    }
    return (
      <span class="flex flex-wrap gap-1">
        {codes.map((c) => <Tag key={c} size="xs" variant="success">{c}</Tag>)}
      </span>
    );
  }

  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "username", label: "管理员", sortable: true },
    { prop: "email", label: "邮箱", sortable: true },
    {
      prop: "roleCodes",
      label: "角色",
      value: renderRoleCodes,
    },
    {
      prop: "status",
      label: "状态",
      type: "tag",
      sortable: true,
      options: STATUS,
    },
    {
      type: "actions",
      width: 160,
      actions: {
        view: true,
        edit: false,
        remove: false,
        assign: {
          label: "分配",
          action: (row: Row) => {
            void openAssign(row);
          },
        },
      },
    },
  ];

  /** 搜索区字段 */
  const search = {
    props: [
      {
        prop: "username",
        label: "管理员",
        placeholder: "请输入管理员用户名查询",
      },
      { prop: "email", label: "邮箱", placeholder: "请输入邮箱查询" },
    ],
  };

  /** 详情抽屉字段与底栏操作 */
  const view = {
    title: (row: Row) => `分配明细 · ${String(row.username ?? "")}`,
    props: [
      { prop: "username", label: "管理员" },
      { prop: "email", label: "邮箱" },
      { prop: "roleCodes", label: "角色" },
      { prop: "status", label: "状态", options: STATUS },
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
        title="权限分配"
        panelKey="assign"
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
        view={view}
        defaultSort={{ prop: "username", order: "asc" }}
        toolbar={{
          create: false,
          search: true,
          refresh: true,
          export: false,
        }}
        class="adm-data-panel adm-panel-card"
        pageSize={10}
      />
      <Modal
        open={assignOpen}
        title={() => `${String(assignRow.value?.username ?? "")}-分配权限`}
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
            <div class="grid gap-4">
              <Transfer
                dataSource={roles.value.map((r) => ({
                  key: r.name,
                  title: r.description
                    ? `${r.name} · ${r.description}`
                    : r.name,
                }))}
                targetKeys={targetKeys}
                showSearch
                titles={["可分配", "已分配"]}
                searchPlaceholder={["搜索", "搜索"]}
                listStyle={{ width: 300, height: 280 }}
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
                    assignOpen.value = false;
                  }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={busy.value}
                  onClick={() => {
                    void save();
                  }}
                >
                  确定
                </Button>
              </div>
            </div>
          )}
      </Modal>
    </>
  );
}
