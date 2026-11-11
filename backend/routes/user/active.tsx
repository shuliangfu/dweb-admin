/**
 * 活跃会员：ui-view DataPanel 直写本页（参照 `rbac/admins/index.tsx`）。
 * Action API 在 `/api/user/active`（资源 `user.active`）；列表通过 `fixed` 固定 status=active。
 */
import { type Column, DataPanel, type Row } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

const STATUS = [
  { value: "active", label: "正常" },
  { value: "pending", label: "待处理" },
  { value: "zombie", label: "僵尸" },
  { value: "disabled", label: "禁用" },
];

export default function UserActivePage() {
  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "username", label: "用户名", sortable: true },
    { prop: "nickname", label: "昵称", sortable: true },
    {
      prop: "level",
      label: "级别",
      type: "number",
      sortable: true,
      headerAlign: "center",
      inline: "number",
    },
    { prop: "email", label: "邮箱", sortable: true },
    { prop: "mobile", label: "手机号" },
    {
      prop: "status",
      label: "用户状态",
      type: "tag",
      sortable: true,
      options: STATUS,
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
      { prop: "username", label: "用户名", placeholder: "请输入用户名查询" },
      { prop: "nickname", label: "昵称", placeholder: "请输入昵称查询" },
      { prop: "email", label: "邮箱", placeholder: "请输入邮箱查询" },
      { prop: "mobile", label: "手机号", placeholder: "请输入手机号查询" },
      {
        prop: "status",
        label: "用户状态",
        type: "select" as const,
        options: STATUS,
        placeholder: "请选择用户状态",
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

  /** 编辑表单字段（本页按 Vue 关闭新建） */
  const form = {
    props: [
      {
        prop: "username",
        label: "用户名",
        required: true,
        rules: [{ required: true, message: "请输入用户名" }],
      },
      { prop: "nickname", label: "昵称" },
      { prop: "avatar", label: "头像" },
      { prop: "level", label: "级别", type: "number" as const, initial: 0 },
      { prop: "email", label: "邮箱" },
      { prop: "mobile", label: "手机号" },
      {
        prop: "status",
        label: "用户状态",
        type: "select" as const,
        options: STATUS,
        initial: "active",
      },
      { prop: "remark", label: "备注", type: "textarea" as const },
    ],
  };

  /** 详情抽屉字段 */
  const view = {
    title: (row: Row) => `会员明细 · ${String(row.username ?? "")}`,
    props: [
      { prop: "username", label: "用户名" },
      { prop: "nickname", label: "昵称" },
      { prop: "avatar", label: "头像" },
      { prop: "level", label: "级别" },
      { prop: "email", label: "邮箱" },
      { prop: "mobile", label: "手机号" },
      { prop: "status", label: "用户状态", options: STATUS },
      { prop: "login_ip", label: "登录IP" },
      { prop: "login_at", label: "登录时间" },
      { prop: "login_count", label: "登录次数" },
      { prop: "lock", label: "自动锁屏时间" },
      { prop: "remark", label: "备注" },
      { prop: "createdAt", label: "创建时间" },
      { prop: "updatedAt", label: "更新时间" },
    ],
  };

  return (
    <DataPanel
      title="活跃会员"
      panelKey="user-active"
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
      fixed={{ status: "active" }}
      defaultSort={{ prop: "createdAt", order: "desc" }}
      toolbar={{
        create: false,
        search: true,
        refresh: true,
        export: true,
      }}
      class="adm-data-panel adm-panel-card"
      pageSize={10}
    />
  );
}
