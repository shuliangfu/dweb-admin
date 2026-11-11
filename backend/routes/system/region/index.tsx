/**
 * 地区列表：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/system/region`（资源 `system.region`）。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

export default function Page() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "name", label: "地区名称", sortable: true },
    { prop: "pname", label: "父级地区", sortable: true },
    {
      prop: "level",
      label: "等级",
      type: "number",
      sortable: true,
      headerAlign: "center",
      inline: "number",
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
      { prop: "gid", label: "区域ID", placeholder: "请输入区域ID查询" },
      { prop: "pid", label: "父级ID", placeholder: "请输入父级ID查询" },
      { prop: "name", label: "名称", placeholder: "请输入名称查询" },
      {
        prop: "level",
        label: "等级",
        type: "number" as const,
        placeholder: "请输入等级查询",
      },
    ],
  };

  /** 新建／编辑表单字段 */
  const form = {
    props: [
      {
        prop: "name",
        label: "地区名称",
        required: true,
        rules: [{ required: true, message: "请输入地区名称" }],
      },
      { prop: "pname", label: "父级地区" },
      {
        prop: "level",
        label: "等级",
        type: "number" as const,
        initial: 0,
      },
      { prop: "gid", label: "区域ID" },
      { prop: "pid", label: "父级ID" },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `地区明细 · ${String(row.name ?? "")}`,
    props: [
      { prop: "name", label: "地区名称" },
      { prop: "pname", label: "父级地区" },
      { prop: "level", label: "等级" },
      { prop: "gid", label: "区域ID" },
      { prop: "pid", label: "父级ID" },
    ],
  };

  return (
    <DataPanel
      title="地区列表"
      panelKey="system-region"
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
  );
}
