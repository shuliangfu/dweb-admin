/**
 * 在线管理员：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/system/online`（资源 `online`）。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

export default function Page() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "username", label: "用户名", sortable: true },
    { prop: "ip", label: "登录IP", sortable: true },
    { prop: "userAgent", label: "浏览器", sortable: true },
    {
      prop: "updatedAt",
      label: "最后活动",
      type: "datetime",
      sortable: true,
      headerAlign: "center",
    },
    {
      prop: "expiresAt",
      label: "过期时间",
      type: "datetime",
      sortable: true,
      headerAlign: "center",
    },
    {
      type: "actions",
      width: 200,
      actions: {
        view: true,
        edit: false,
        remove: true,
      },
    },
  ];

  /** 搜索区字段 */
  const search = {
    props: [
      {
        prop: "keyword",
        label: "用户名",
        placeholder: "请输入管理员用户名查询",
      },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `在线明细 · ${String(row.username ?? "")}`,
    props: [
      { prop: "username", label: "用户名" },
      { prop: "ip", label: "登录IP" },
      { prop: "userAgent", label: "浏览器" },
      { prop: "updatedAt", label: "最后活动" },
      { prop: "expiresAt", label: "过期时间" },
    ],
  };

  return (
    <DataPanel
      title="在线管理员"
      panelKey="online"
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
      defaultSort={{ prop: "updatedAt", order: "desc" }}
      toolbar={{
        search: true,
        refresh: true,
        export: false,
      }}
      class="adm-data-panel adm-panel-card"
      pageSize={10}
    />
  );
}
