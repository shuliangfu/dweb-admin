/**
 * Member list — gold-standard DataPanel (same shape as `rbac/admins/index.tsx`).
 * Action API at `/api/user-index` (resource `user.index`); not `/api/users`.
 */
import { DataPanel, type DataPanelColumn, type FormField, type SearchField, type ViewProp } from "@dreamer/ui-view";
import { csrfHeaders } from "@common/utils/client-api.ts";

const STATUS = [
  { value: "active", label: "正常" },
  { value: "pending", label: "待处理" },
  { value: "zombie", label: "僵尸" },
  { value: "disabled", label: "禁用" },
];

const columns: DataPanelColumn[] = [
  { type: "selection" },
  { type: "index", label: "#" },
  { prop: "username", label: "用户名", sortable: true },
  { prop: "nickname", label: "昵称", sortable: true },
  { prop: "level", label: "级别", type: "number", sortable: true, headerAlign: "center", inline: "number" },
  { prop: "email", label: "邮箱", sortable: true },
  { prop: "mobile", label: "手机号" },
  { prop: "status", label: "用户状态", type: "tag", sortable: true, options: STATUS },
  { prop: "createdAt", label: "创建时间", type: "datetime", sortable: true, headerAlign: "center" },
  { type: "actions", width: 200, actions: [{ name: "view" }, { name: "edit" }, { name: "remove" }] },
];

const search: SearchField[] = [
  { prop: "username", label: "用户名", placeholder: "请输入用户名查询" },
  { prop: "nickname", label: "昵称", placeholder: "请输入昵称查询" },
  { prop: "email", label: "邮箱", placeholder: "请输入邮箱查询" },
  { prop: "mobile", label: "手机号", placeholder: "请输入手机号查询" },
  { prop: "status", label: "用户状态", type: "select", options: STATUS, placeholder: "请选择用户状态" },
  { prop: "start", label: "开始时间", type: "date", field: "createdAt", match: "from", placeholder: "请选择开始时间" },
  { prop: "end", label: "结束时间", type: "date", field: "createdAt", match: "to", placeholder: "请选择结束时间" },
];

const form: FormField[] = [
  { prop: "username", label: "用户名", required: true, rules: [{ required: true, message: "请输入用户名" }] },
  { prop: "nickname", label: "昵称" },
  { prop: "avatar", label: "头像" },
  { prop: "level", label: "级别", type: "number", initial: 0 },
  { prop: "email", label: "邮箱" },
  { prop: "mobile", label: "手机号" },
  { prop: "status", label: "用户状态", type: "select", options: STATUS, initial: "active" },
  { prop: "remark", label: "备注", type: "textarea" },
];

const view: ViewProp[] = [
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
];

export default function UserIndexPage() {
  return (
    <DataPanel
      panelKey="user-index"
      title="会员列表"
      baseRoute="/api/user-index"
      apiMode="action"
      apiHeaders={csrfHeaders}
      apiCredentials="same-origin"
      columns={columns}
      search={search}
      form={form}
      view={{ title: (row) => `会员明细 · ${String(row.username ?? "")}`, props: view }}
      toolbar={{ create: true, search: true, refresh: true, export: true }}
      caps={{ import: false, print: false, columns: false, density: false, fullscreen: false, copy: false }}
      defaultSort={{ prop: "createdAt", order: "desc" }}
      pageSize={10}
      class="adm-data-panel adm-panel-card"
    />
  );
}
