/**
 * 路由列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/rbac/routes`。AuthRoute 没有独立 name 字段，
 * 列与表单按 method + path 对稿 Vue `admin/route/index.vue`。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "*"].map((m) => ({
  value: m,
  label: m,
}));

const SOURCE = [
  { value: "manual", label: "手动添加", tone: "info" },
  { value: "scan", label: "扫描", tone: "success" },
  { value: "seed", label: "初始化", tone: "default" },
];

export default function RoutesPage() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    {
      prop: "path",
      label: "路由地址",
      sortable: true,
      minWidth: 250,
      align: "left",
      headerAlign: "center",
    },
    {
      prop: "method",
      label: "请求方法",
      sortable: true,
      minWidth: 100,
      headerAlign: "center",
    },
    {
      prop: "source",
      label: "来源",
      type: "tag",
      sortable: true,
      options: SOURCE,
    },
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
      { prop: "path", label: "路由地址", placeholder: "请输入路由地址查询" },
      {
        prop: "method",
        label: "请求方法",
        type: "select" as const,
        options: METHODS,
        placeholder: "请选择请求方法",
      },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "method",
        label: "请求方法",
        required: true,
        type: "select" as const,
        options: METHODS,
        rules: [{ required: true, message: "请求方法不能为空" }],
      },
      {
        prop: "path",
        label: "路由地址",
        required: true,
        rules: [
          { required: true, message: "路由地址不能为空" },
          { pattern: /^\/\S*$/, message: "路由地址须以 / 开头" },
        ],
      },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) =>
      `路由明细 · ${String(row.method ?? "")} ${String(row.path ?? "")}`,
    props: [
      { prop: "method", label: "请求方法" },
      { prop: "path", label: "路由地址" },
      { prop: "source", label: "来源" },
      { prop: "createdAt", label: "创建时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
  };

  return (
    <DataPanel
      title="路由列表"
      panelKey="routes"
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
      defaultSort={{ prop: "path", order: "asc" }}
      toolbar={{
        create: true,
        search: true,
        refresh: true,
        export: true,
      }}
      class="adm-data-panel adm-panel-card"
      pageSize={10}
    />
  );
}
