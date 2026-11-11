/**
 * 系统日志列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/developer/system`（资源 `developer.system`）。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

export default function Page() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    {
      prop: "level",
      label: "级别",
      type: "number",
      sortable: true,
      headerAlign: "center",
      inline: "number",
    },
    { prop: "message", label: "消息", sortable: true },
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
      {
        prop: "level",
        label: "级别",
        type: "text" as const,
        placeholder: "请输入级别查询",
      },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "level",
        label: "级别",
        type: "number" as const,
        initial: 0,
      },
      { prop: "message", label: "消息" },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `系统日志明细 · ${String(row.message ?? "")}`,
    props: [
      { prop: "level", label: "级别" },
      { prop: "message", label: "消息" },
      { prop: "createdAt", label: "时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
  };

  return (
    <DataPanel
      title="系统日志列表"
      panelKey="developer-system"
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
