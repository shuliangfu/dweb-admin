/**
 * 数据备份列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/developer/database`（资源 `developer.database`）。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

export default function Page() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "name", label: "备份名", sortable: true },
    {
      prop: "size",
      label: "大小",
      type: "number",
      sortable: true,
      headerAlign: "center",
      inline: "number",
    },
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
      { prop: "name", label: "备份名", placeholder: "请输入备份名查询" },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "name",
        label: "备份名",
        required: true,
        rules: [{ required: true, message: "请输入备份名" }],
      },
      {
        prop: "size",
        label: "大小",
        type: "number" as const,
        initial: 0,
      },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `数据备份明细 · ${String(row.name ?? "")}`,
    props: [
      { prop: "name", label: "备份名" },
      { prop: "size", label: "大小" },
      { prop: "createdAt", label: "时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
  };

  return (
    <DataPanel
      title="数据备份列表"
      panelKey="developer-database"
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
