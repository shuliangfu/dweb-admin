/**
 * 问题反馈列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/developer/feedback`（资源 `developer.feedback`）。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

const STATUS = [
  { value: "active", label: "正常" },
  { value: "pending", label: "待处理" },
  { value: "zombie", label: "僵尸" },
  { value: "disabled", label: "禁用" },
];

export default function Page() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "title", label: "标题", sortable: true },
    {
      prop: "status",
      label: "状态",
      type: "tag",
      sortable: true,
      options: STATUS,
    },
    { prop: "user", label: "用户", sortable: true },
    {
      prop: "createdAt",
      label: "时间",
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
      { prop: "title", label: "标题", placeholder: "请输入标题查询" },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "title",
        label: "标题",
        required: true,
        rules: [{ required: true, message: "请输入标题" }],
      },
      {
        prop: "status",
        label: "状态",
        type: "select" as const,
        options: STATUS,
        initial: "active",
      },
      { prop: "user", label: "用户" },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `问题反馈明细 · ${String(row.title ?? "")}`,
    props: [
      { prop: "title", label: "标题" },
      { prop: "status", label: "状态", options: STATUS },
      { prop: "user", label: "用户" },
      { prop: "createdAt", label: "时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
  };

  return (
    <DataPanel
      title="问题反馈列表"
      panelKey="developer-feedback"
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
      defaultSort={{ prop: "createdAt", order: "desc" }}
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
