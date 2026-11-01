/** Resources over the existing RBAC / account / menu / session services. */
import {
  AdminSession,
  AdminUser,
  type AdminSessionDocument,
  type AdminUserDocument,
  AuthItem,
  type AuthItemDocument,
  AuthRoute,
  type AuthRouteDocument,
  type ItemType,
  type MenuDocument,
} from "@common/model/mod.ts";
import { createMenu, createUser, deleteMenu, deleteUser, listAllMenus, updateMenu, updateUser } from "@common/service/admin-crud.ts";
import { roleOptions } from "@common/service/rbac-admin.ts";
import { t } from "@common/i18n/mod.ts";
import { addRoutes, deleteItem, parseRouteInput, removeRoutes } from "@common/service/rbac-admin.ts";
import { revokeSessionById } from "@common/service/auth.ts";
import { buildWhere, docToRow } from "./mongo.ts";
import { type ColDef, type Ctx, type Fail, type FormDef, l, type ListQuery, type ListResult, type Opt, type RemoveResult, type ResourceDef, type Row, type SearchDef } from "./types.ts";
import { escapeRe } from "@common/service/list.ts";
import { pickLocalized } from "@common/i18n/mod.ts";

const ts = (v: unknown) => (v ? new Date(v as string).toISOString() : "");

const STATUS_OPTS: Opt[] = [
  { value: "active", label: l("启用", "Enabled"), tone: "success" },
  { value: "disabled", label: l("禁用", "Disabled"), tone: "default" },
];

async function eachResult(
  ids: string[],
  fn: (id: string) => Promise<{ ok: boolean; error?: string }>,
): Promise<RemoveResult> {
  const res: RemoveResult = { removed: 0, failed: [] };
  for (const id of ids) {
    const r = await fn(id);
    if (r.ok) res.removed++;
    else res.failed.push({ id, error: r.error ?? "invalid" });
  }
  return res;
}

// ------------------------------------------------------------------ admins
const adminSearch: SearchDef[] = [
  { name: "username", label: l("用户名", "Username") },
  { name: "email", label: l("邮箱", "Email") },
  { name: "status", label: l("状态", "Status"), type: "select", options: STATUS_OPTS },
];
const adminColumns: ColDef[] = [
  { prop: "username", label: l("用户名", "Username"), sortable: true },
  { prop: "nickname", label: l("昵称", "Nickname"), sortable: true },
  { prop: "email", label: l("邮箱", "Email"), sortable: true },
  { prop: "roleCodes", label: l("角色", "Roles") },
  { prop: "status", label: l("状态", "Status"), type: "tag", options: STATUS_OPTS, inline: "switch", sortable: true },
  { prop: "loginCount", label: l("登录次数", "Logins"), type: "number", sortable: true },
  { prop: "lastLoginIp", label: l("登录IP", "Login IP"), hidden: true },
  { prop: "lastLoginAt", label: l("最后登录", "Last login"), type: "datetime", sortable: true },
  { prop: "createdAt", label: l("创建时间", "Created"), type: "datetime", sortable: true },
];

export function adminRow(u: AdminUserDocument & Record<string, unknown>): Row {
  return {
    id: String(u._id),
    username: u.username,
    nickname: u.nickname,
    email: u.email ?? "",
    avatar: (u.avatar as string) ?? "",
    roleCodes: u.roleCodes ?? [],
    status: u.status,
    totpEnabled: !!u.totpEnabled,
    passkeyEnabled: !!u.passkeyEnabled,
    loginCount: Number(u.loginCount ?? 0),
    lastLoginIp: (u.lastLoginIp as string) ?? "",
    lockMinutes: Number(u.lockMinutes ?? 0),
    lastLoginAt: ts(u.lastLoginAt),
    createdAt: ts(u.createdAt),
    updatedAt: ts(u.updatedAt),
  };
}

const adminForm: FormDef[] = [
  { name: "username", label: l("用户名", "Username"), required: true, createOnly: true, min: 2, max: 32, pattern: "^[A-Za-z][A-Za-z0-9_]*$" },
  { name: "nickname", label: l("昵称", "Nickname"), max: 64 },
  { name: "email", label: l("邮箱", "Email"), required: true, max: 128, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
  { name: "avatar", label: l("头像地址", "Avatar URL"), max: 500 },
  { name: "password", label: l("密码", "Password"), type: "password", min: 6, max: 64 },
  { name: "password2", label: l("确认密码", "Confirm password"), type: "password", max: 64 },
  { name: "roleCodes", label: l("角色", "Roles"), type: "multiselect" },
  { name: "lockMinutes", label: l("自动锁屏（分钟，0=不锁）", "Auto-lock (minutes, 0 = never)"), type: "number", min: 0, max: 1440, initial: 0 },
  { name: "status", label: l("状态", "Status"), type: "switch", onOff: ["active", "disabled"], initial: "active" },
];

/** Body → what createUser/updateUser accept, with the confirm-password check. */
function adminBody(body: Record<string, unknown>, creating: boolean, ctx: Ctx): { data: Record<string, unknown> } | { fail: Fail } {
  const messages: Record<string, string> = {};
  const pwd = String(body.password ?? "");
  if (creating && !pwd) messages.password = t(ctx.locale, "form.required");
  if ((pwd || body.password2) && pwd !== String(body.password2 ?? "")) messages.password2 = t(ctx.locale, "usersForm.passwordMismatch");
  const email = String(body.email ?? "").trim();
  if (!email) messages.email = t(ctx.locale, "form.required");
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) messages.email = t(ctx.locale, "form.pattern");
  if (Object.keys(messages).length) return { fail: { ok: false, error: "invalid", fields: Object.keys(messages), messages } };
  const data: Record<string, unknown> = {
    nickname: body.nickname,
    email,
    roleCodes: Array.isArray(body.roleCodes) ? body.roleCodes : [],
    status: body.status || "active",
  };
  if (pwd) data.password = pwd;
  if (creating) data.username = body.username;
  return { data };
}

async function saveAdminExtras(id: string | null, body: Record<string, unknown>, username?: string): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (body.avatar !== undefined) patch.avatar = String(body.avatar ?? "").slice(0, 500);
  if (body.lockMinutes !== undefined) patch.lockMinutes = Math.max(0, Math.min(1440, Number(body.lockMinutes) || 0));
  if (!Object.keys(patch).length) return;
  const doc = id ? { _id: id } : await AdminUser.findOne({ username } as never) as { _id?: string } | null;
  if (doc?._id) await AdminUser.updateById(String(doc._id), patch);
}

export const adminsResource: ResourceDef = {
  key: "admins",
  title: l("管理员", "Admins"),
  path: "/rbac/admins",
  columns: adminColumns,
  search: adminSearch,
  defaultSort: { prop: "username", order: "asc" },
  statusField: "status",
  statusValues: STATUS_OPTS,
  form: adminForm,
  async dynamicOptions() {
    return { roleCodes: (await roleOptions()).map((r) => ({ value: r.name, label: r.description ? `${r.name} · ${r.description}` : r.name })) };
  },
  async create(body, ctx) {
    const b = adminBody(body, true, ctx);
    if ("fail" in b) return b.fail;
    const r = await createUser(b.data);
    if (r.ok) await saveAdminExtras(null, body, String(b.data.username));
    return r as never;
  },
  async update(id, body, ctx) {
    const b = adminBody(body, false, ctx);
    if ("fail" in b) return b.fail;
    const r = await updateUser(id, b.data);
    if (r.ok) await saveAdminExtras(id, body);
    return r as never;
  },
  async list(q: ListQuery): Promise<ListResult> {
    const where = buildWhere(adminSearch, q.filters);
    const sort: Record<string, 1 | -1> = q.sort ? { [q.sort]: q.order } : { username: 1 };
    const r = await AdminUser.paginate(where as never, q.page, q.pageSize, sort);
    return { rows: (r.data as unknown as AdminUserDocument[]).map((u) => adminRow(u as never)), total: r.total };
  },
  async get(id) {
    const u = await AdminUser.findOne({ _id: id } as never) as AdminUserDocument | null;
    return u ? adminRow(u as never) : null;
  },
  remove: (ids, ctx) => eachResult(ids, (id) => deleteUser(id, ctx.userId)),
  setField: (ids, field, value, _ctx) => {
    if (field !== "status") return Promise.resolve({ removed: 0, failed: ids.map((id) => ({ id, error: "invalid" })) });
    return eachResult(ids, (id) => updateUser(id, { status: String(value) }));
  },
};

// ------------------------------------------------------- roles / permissions
function itemResource(type: ItemType): ResourceDef {
  const search: SearchDef[] = [
    { name: "name", label: l("名称", "Name") },
    { name: "info", label: l("描述", "Description"), field: "description" },
  ];
  const columns: ColDef[] = [
    { prop: "name", label: l("名称", "Name"), sortable: true },
    { prop: "description", label: l("描述", "Description"), sortable: true },
    { prop: "createdAt", label: l("创建时间", "Created"), type: "datetime", sortable: true },
    { prop: "updatedAt", label: l("更新时间", "Updated"), type: "datetime", sortable: true },
  ];
  return {
    key: type === "role" ? "roles" : "permissions",
    title: type === "role" ? l("角色", "Roles") : l("权限", "Permissions"),
    path: type === "role" ? "/rbac/roles" : "/rbac/permissions",
    columns,
    search,
    defaultSort: { prop: "name", order: "asc" },
    async list(q): Promise<ListResult> {
      const where = { type, ...buildWhere(search, q.filters) } as Record<string, unknown>;
      const sort: Record<string, 1 | -1> = q.sort ? { [q.sort]: q.order } : { name: 1 };
      const r = await AuthItem.paginate(where as never, q.page, q.pageSize, sort);
      return {
        rows: (r.data as unknown as AuthItemDocument[]).map((i) => ({
          id: i.name,
          name: i.name,
          description: i.description ?? "",
          ruleName: i.ruleName ?? "",
          isSuper: !!i.isSuper,
          locked: !!i.isSuper,
          createdAt: ts(i.createdAt),
          updatedAt: ts(i.updatedAt),
        })),
        total: r.total,
      };
    },
    remove: (ids) => eachResult(ids, (id) => deleteItem(type, id)),
  };
}
export const rolesResource = itemResource("role");
export const permissionsResource = itemResource("permission");

// -------------------------------------------------------------------- menus
const menuSearch: SearchDef[] = [
  { name: "keyword", label: l("标识", "Key") },
  { name: "path", label: l("路径", "Path") },
];
const menuForm: FormDef[] = [
  { name: "key", label: l("标识", "Key"), required: true, createOnly: true, pattern: "^[a-z][a-z0-9_.-]{0,63}$", placeholder: l("例如 rbac.admins", "e.g. rbac.admins") },
  { name: "parentKey", label: l("上级菜单", "Parent"), type: "select" },
  { name: "titleZh", label: l("中文标题", "Title (zh)"), max: 64 },
  { name: "titleEn", label: l("英文标题", "Title (en)"), max: 64 },
  { name: "path", label: l("路径", "Path"), max: 200, placeholder: l("/rbac/admins", "/rbac/admins") },
  { name: "icon", label: l("图标", "Icon"), max: 32, initial: "star" },
  { name: "sort", label: l("排序", "Sort"), type: "number", initial: 100 },
  { name: "status", label: l("显示", "Visible"), type: "switch", onOff: ["active", "disabled"], initial: "active" },
];
const menuBody = (b: Record<string, unknown>) => ({
  key: b.key,
  parentKey: String(b.parentKey ?? ""),
  title: { "zh-CN": String(b.titleZh ?? ""), "en-US": String(b.titleEn ?? "") },
  path: String(b.path ?? ""),
  icon: String(b.icon ?? "") || "star",
  sort: Number(b.sort ?? 100),
  status: String(b.status ?? "active"),
});

export const menusResource: ResourceDef = {
  key: "menus",
  title: l("菜单管理", "Menus"),
  path: "/developer/menus",
  columns: [
    { prop: "title", label: l("标题", "Title"), sortable: true },
    { prop: "parentTitle", label: l("上级", "Parent") },
    { prop: "path", label: l("路径", "Path"), sortable: true },
    { prop: "icon", label: l("图标", "Icon") },
    { prop: "sort", label: l("排序", "Sort"), type: "number", sortable: true },
    { prop: "status", label: l("显示", "Visible"), type: "tag", options: STATUS_OPTS, inline: "switch", sortable: true },
    { prop: "key", label: l("标识", "Key"), sortable: true },
  ],
  search: menuSearch,
  defaultSort: { prop: "sort", order: "asc" },
  statusField: "status",
  statusValues: STATUS_OPTS,
  form: menuForm,
  async dynamicOptions(ctx) {
    const all = await listAllMenus();
    return {
      parentKey: [{ value: "", label: t(ctx.locale, "menusForm.topLevel") }, ...all.filter((m) => !m.parentKey).map((m) => ({
        value: m.key,
        label: pickLocalized(m.title as never, ctx.locale, m.key),
      }))],
    };
  },
  create: (body) => createMenu(menuBody(body)) as never,
  update: (id, body) => {
    const { key: _k, ...rest } = menuBody(body);
    return updateMenu(id, rest) as never;
  },
  async list(q, ctx): Promise<ListResult> {
    const all = await listAllMenus();
    const byKey = new Map(all.map((m) => [m.key, m]));
    let rows: Row[] = all.map((m) => ({
      id: m.key,
      key: m.key,
      parentKey: m.parentKey,
      parentTitle: m.parentKey ? pickLocalized(byKey.get(m.parentKey)?.title as never, ctx.locale, m.parentKey) : "",
      title: pickLocalized(m.title as never, ctx.locale, m.key),
      titles: m.title,
      titleZh: (m.title as Record<string, string>)["zh-CN"] ?? "",
      titleEn: (m.title as Record<string, string>)["en-US"] ?? "",
      path: m.path,
      icon: m.icon,
      sort: m.sort,
      status: m.status,
    }));
    const kw = q.filters.keyword?.toLowerCase();
    if (kw) rows = rows.filter((r) => String(r.key).toLowerCase().includes(kw) || String(r.title).toLowerCase().includes(kw));
    const pq = q.filters.path?.toLowerCase();
    if (pq) rows = rows.filter((r) => String(r.path).toLowerCase().includes(pq));
    const prop = q.sort || "sort";
    rows.sort((a, b) => {
      const x = a[prop], y = b[prop];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
      return (c || String(a.key).localeCompare(String(b.key))) * q.order;
    });
    const total = rows.length;
    const start = (q.page - 1) * q.pageSize;
    return { rows: rows.slice(start, start + q.pageSize), total };
  },
  remove: (ids) => eachResult(ids, (id) => deleteMenu(id)),
  setField: (ids, field, value) => {
    if (field !== "status") return Promise.resolve({ removed: 0, failed: ids.map((id) => ({ id, error: "invalid" })) });
    return eachResult(ids, (id) => updateMenu(id, { status: String(value) }));
  },
};

// ------------------------------------------------------------------- online
const onlineSearch: SearchDef[] = [{ name: "keyword", label: l("用户名", "Username"), field: "username" }];
export const onlineResource: ResourceDef = {
  key: "online",
  title: l("在线管理员", "Online admins"),
  path: "/system/online",
  columns: [
    { prop: "username", label: l("用户名", "Username"), sortable: true },
    { prop: "ip", label: l("登录IP", "IP") },
    { prop: "userAgent", label: l("浏览器", "User agent") },
    { prop: "updatedAt", label: l("最后活动", "Last active"), type: "datetime", sortable: true },
    { prop: "expiresAt", label: l("过期时间", "Expires"), type: "datetime", sortable: true },
  ],
  search: onlineSearch,
  defaultSort: { prop: "updatedAt", order: "desc" },
  async list(q): Promise<ListResult> {
    const where = { ...buildWhere(onlineSearch, q.filters), expiresAt: { $gt: new Date() } } as Record<string, unknown>;
    const sort: Record<string, 1 | -1> = q.sort ? { [q.sort]: q.order } : { updatedAt: -1 };
    const r = await AdminSession.paginate(where as never, q.page, q.pageSize, sort);
    return {
      rows: (r.data as unknown as AdminSessionDocument[]).map((s) => ({
        id: String(s._id),
        username: s.username,
        ip: s.ip ?? "",
        userAgent: s.userAgent ?? "",
        updatedAt: ts(s.updatedAt),
        expiresAt: ts(s.expiresAt),
      })),
      total: r.total,
    };
  },
  remove: (ids, ctx: Ctx) => eachResult(ids, (id) => revokeSessionById(id, ctx.request)),
};
export { escapeRe, docToRow };

// ------------------------------------------------------------------- assign
export const assignResource: ResourceDef = {
  key: "assign",
  title: l("权限分配", "Role assignment"),
  path: "/rbac/assign",
  columns: [
    { prop: "username", label: l("用户名", "Username"), sortable: true },
    { prop: "email", label: l("邮箱", "Email"), sortable: true },
    { prop: "roleCodes", label: l("角色", "Roles") },
    { prop: "status", label: l("状态", "Status"), type: "tag", options: STATUS_OPTS, sortable: true },
  ],
  search: [
    { name: "username", label: l("用户名", "Username") },
    { name: "email", label: l("邮箱", "Email") },
  ],
  defaultSort: { prop: "username", order: "asc" },
  list: (q, ctx) => adminsResource.list(q, ctx),
  get: (id, ctx) => adminsResource.get!(id, ctx),
};

// ------------------------------------------------------------------- routes
const routeSearch: SearchDef[] = [
  { name: "path", label: l("路径", "Path") },
  {
    name: "method",
    label: l("方法", "Method"),
    type: "select",
    match: "eq",
    options: ["GET", "POST", "PUT", "PATCH", "DELETE", "*"].map((m) => ({ value: m, label: l(m, m) })),
  },
];
export const routesResource: ResourceDef = {
  key: "routes",
  title: l("路由", "Routes"),
  path: "/rbac/routes",
  columns: [
    { prop: "path", label: l("路由路径", "Path"), sortable: true },
    { prop: "method", label: l("请求方法", "Method"), sortable: true },
    {
      prop: "source",
      label: l("来源", "Source"),
      type: "tag",
      sortable: true,
      options: [
        { value: "manual", label: l("手动添加", "Manual"), tone: "info" },
        { value: "scan", label: l("扫描", "Scanned"), tone: "success" },
        { value: "seed", label: l("初始化", "Seed"), tone: "default" },
      ],
    },
    { prop: "createdAt", label: l("创建时间", "Created"), type: "datetime", sortable: true },
  ],
  search: routeSearch,
  defaultSort: { prop: "path", order: "asc" },
  view: false,
  form: [{ name: "routes", label: l("路由（每行一条）", "Routes (one per line)"), type: "textarea", required: true, placeholder: l("GET /api/orders\n/reports/*", "GET /api/orders\n/reports/*") }],
  async create(body) {
    const keys = parseRouteInput(String(body.routes ?? ""));
    if (!keys) return { ok: false, error: "routeInvalid", fields: ["routes"], messages: { routes: "GET /path" } };
    return await addRoutes(keys, "manual") as never;
  },
  async list(q): Promise<ListResult> {
    const where = buildWhere(routeSearch, q.filters);
    const sort: Record<string, 1 | -1> = q.sort ? { [q.sort]: q.order } : { path: 1 };
    const r = await AuthRoute.paginate(where as never, q.page, q.pageSize, sort);
    return {
      rows: (r.data as unknown as AuthRouteDocument[]).map((x) => ({
        id: `${x.method} ${x.path}`,
        method: x.method,
        path: x.path,
        source: x.source,
        createdAt: ts(x.createdAt),
      })),
      total: r.total,
    };
  },
  remove: (ids) => eachResult(ids, (id) => removeRoutes([id])),
};
