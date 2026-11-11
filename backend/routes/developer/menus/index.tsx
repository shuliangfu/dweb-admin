/**
 * 菜单列表：ui-view DataPanel 直写本页（参照管理员金标）。
 * 默认只列顶级；点标题下钻到子级（URL ?parentKey=）。数据源与侧栏菜单相同。
 */
import type { LoadContext } from "@dreamer/dweb";
import {
  Badge,
  Breadcrumb,
  Button,
  type Column,
  DataPanel,
  Link,
  type Row,
} from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

const STATUS = [
  { value: "active", label: "显示", tone: "success" as const },
  { value: "disabled", label: "隐藏", tone: "default" as const },
];

function goMenus(parentKey?: string): void {
  const g = globalThis as unknown as {
    location?: { assign: (u: string) => void };
  };
  if (!g.location?.assign) return;
  const q = parentKey ? `?parentKey=${encodeURIComponent(parentKey)}` : "";
  g.location.assign(`/developer/menus${q}`);
}

export async function load(ctx: LoadContext) {
  const parentKey = new URL(ctx.req.url).searchParams.get("parentKey") ?? "";
  const { listAllMenus } = await import("@common/service/admin-crud.ts");
  const { pickLocalized } = await import("@common/i18n/mod.ts");
  const all = await listAllMenus();
  const parents = all
    .filter((m) => !m.parentKey)
    .map((m) => ({
      value: m.key,
      label: pickLocalized(m.title as never, "zh-CN", m.key),
    }));
  return { parentKey, parents };
}

type Data = {
  parentKey?: string;
  parents?: { value: string; label: string }[];
};

export default function MenusPage(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  const parentKey = d.parentKey ?? "";
  const parentOptions = [
    { value: "", label: "顶级菜单" },
    ...(d.parents ?? []),
  ];

  const columns: Column[] = [
    {
      prop: "title",
      label: "标题",
      sortable: true,
      minWidth: 150,
      value: (row: Row) => {
        const label = String(row.title ?? "");
        const n = Number(row.childCount ?? 0);
        const canDrill = !row.parentKey && n > 0;
        if (!canDrill) return label;
        const href = `/developer/menus?parentKey=${
          encodeURIComponent(String(row.key))
        }`;
        return (
          <span
            class="inline-flex min-w-0 items-center gap-2"
            data-testid="menus-enter-title"
          >
            <Link
              href={href}
              underline
              class="cursor-pointer font-medium"
              title="进入下级菜单"
              onClick={(e: Event) => {
                e.preventDefault();
                goMenus(String(row.key));
              }}
            >
              {label}
            </Link>
            <Badge size="xs" variant="ghost" count={n} />
          </span>
        );
      },
    },
    { prop: "parentTitle", label: "上级", minWidth: 120 },
    { prop: "path", label: "路径", sortable: true, minWidth: 180 },
    { prop: "permission", label: "权限名", minWidth: 120 },
    { prop: "icon", label: "图标" },
    {
      prop: "sort",
      label: "排序",
      type: "number",
      sortable: true,
      align: "center",
      width: 80,
    },
    {
      prop: "status",
      label: "显示",
      type: "tag",
      inline: "switch",
      batch: true,
      align: "center",
      options: STATUS,
      sortable: true,
    },
    { prop: "key", label: "标识", sortable: true, minWidth: 140 },
  ];

  return (
    <div class="flex min-w-0 flex-col">
      {parentKey
        ? (
          <div
            class="mb-2 flex min-w-0 flex-wrap items-center gap-3"
            data-testid="menus-drill"
          >
            <Breadcrumb
              items={[
                {
                  label: "菜单管理",
                  onClick: (e: Event) => {
                    e.preventDefault();
                    goMenus();
                  },
                },
              ]}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="menus-back-top"
              onClick={() => goMenus()}
            >
              返回顶级
            </Button>
          </div>
        )
        : (
          <span
            class="mb-2 block text-xs text-slate-500 dark:text-slate-400"
            data-testid="menus-top-hint"
          >
            默认只显示顶级菜单，点击标题进入下级。
          </span>
        )}
      <DataPanel
        panelKey="menus"
        title="菜单列表"
        columns={columns}
        search={{
          props: [
            { prop: "keyword", label: "标识" },
            { prop: "path", label: "路径" },
            {
              prop: "parentKey",
              label: "上级",
              type: "select" as const,
              options: parentOptions,
            },
          ],
        }}
        form={{
          title: (row?: Row) => row?.id ? "修改菜单" : "添加菜单",
          props: [
            {
              prop: "key",
              label: "标识",
              required: true,
              createOnly: true,
              pattern: "^[a-z][a-z0-9_.-]{0,63}$",
              placeholder: "例如 rbac.admins",
            },
            {
              prop: "parentKey",
              label: "上级菜单",
              type: "select" as const,
              options: parentOptions,
              initial: parentKey || undefined,
            },
            { prop: "titleZh", label: "中文标题", max: 64 },
            { prop: "titleEn", label: "英文标题", max: 64 },
            {
              prop: "path",
              label: "路径",
              max: 200,
              placeholder: "/rbac/admins",
            },
            {
              prop: "permission",
              label: "权限名",
              max: 64,
              placeholder: "例如 admin.view",
            },
            { prop: "icon", label: "图标", max: 32, initial: "star" },
            {
              prop: "sort",
              label: "排序",
              type: "number" as const,
              initial: 100,
            },
            {
              prop: "status",
              label: "显示",
              type: "select" as const,
              options: STATUS,
              initial: "active",
            },
          ],
        }}
        view={{
          title: "菜单明细",
          props: [
            { prop: "title", label: "标题" },
            { prop: "parentTitle", label: "上级" },
            { prop: "path", label: "路径" },
            { prop: "permission", label: "权限名" },
            { prop: "icon", label: "图标" },
            { prop: "sort", label: "排序" },
            { prop: "status", label: "显示", type: "tag", options: STATUS },
            { prop: "key", label: "标识" },
          ],
        }}
        toolbar={{ search: true, refresh: true, create: true, export: false }}
        rowActions={{ view: true, edit: true, remove: true }}
        baseRoute="/api"
        apiMode="action"
        apiHeaders={() => csrfHeaders()}
        apiCredentials="same-origin"
        defaultSort={{ prop: "sort", order: "asc" }}
        initialQuery={parentKey ? { filters: { parentKey } } : undefined}
        fixed={parentKey ? { parentKey } : undefined}
      />
    </div>
  );
}
