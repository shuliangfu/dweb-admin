/**
 * 文章列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/cms/article`（资源 `cms.article`）。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

export default function Page() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "category", label: "分类", sortable: true },
    { prop: "title", label: "标题", sortable: true },
    { prop: "source", label: "来源", sortable: true },
    {
      prop: "visits",
      label: "阅读量",
      type: "number",
      sortable: true,
      headerAlign: "center",
      inline: "number",
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
      { prop: "category", label: "分类", placeholder: "请输入分类查询" },
      { prop: "title", label: "标题", placeholder: "请输入标题查询" },
      { prop: "source", label: "来源", placeholder: "请输入来源查询" },
      {
        prop: "visits",
        label: "阅读量",
        type: "text" as const,
        placeholder: "请输入阅读量查询",
      },
      {
        prop: "start",
        label: "开始时间",
        type: "date" as const,
        field: "createdAt",
        match: "from" as const,
        placeholder: "请选择开始时间",
      },
      {
        prop: "end",
        label: "结束时间",
        type: "date" as const,
        field: "createdAt",
        match: "to" as const,
        placeholder: "请选择结束时间",
      },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "category",
        label: "分类",
        required: true,
        rules: [{ required: true, message: "请输入分类" }],
      },
      {
        prop: "title",
        label: "标题",
        required: true,
        rules: [{ required: true, message: "请输入标题" }],
      },
      { prop: "source", label: "来源" },
      {
        prop: "visits",
        label: "阅读量",
        type: "number" as const,
        initial: 0,
      },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `文章明细 · ${String(row.title ?? "")}`,
    props: [
      { prop: "category", label: "分类" },
      { prop: "title", label: "标题" },
      { prop: "source", label: "来源" },
      { prop: "visits", label: "阅读量" },
      { prop: "createdAt", label: "创建时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
  };

  return (
    <DataPanel
      title="文章列表"
      panelKey="cms-article"
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
