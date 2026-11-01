/**
 * Idempotent seed: indexes, RBAC items + hierarchy, managed routes, menus, default admin.
 * Existing rows are never overwritten (so DB edits and changed passwords survive restarts).
 */
import {
  AdminSession,
  AdminUser,
  AuthItem,
  AuthItemChild,
  AuthRoute,
  type ChildType,
  type ItemType,
  Menu,
  type MenuDocument,
  routeKey,
} from "@common/model/mod.ts";
import { getEnv } from "@common/utils/env.ts";
import { hashPassword } from "@common/service/password.ts";
import { invalidateRbacCache } from "@common/service/rbac.ts";
import { scanRoutes } from "@common/service/route-scan.ts";

export const SUPER_ROLE = "super_admin";
export const OPERATOR_ROLE = "operator";

const ITEMS: { name: string; type: ItemType; description: string; isSuper?: boolean }[] = [
  { name: SUPER_ROLE, type: "role", description: "Super admin: every permission", isSuper: true },
  { name: OPERATOR_ROLE, type: "role", description: "Operator: read-only access to the admin list" },
  { name: "admin.view", type: "permission", description: "View administrators" },
];

/** parent → children (role ⊇ permission ⊇ routes). */
const CHILDREN: { parent: string; type: ChildType; child: string }[] = [
  { parent: OPERATOR_ROLE, type: "permission", child: "admin.view" },
  { parent: "admin.view", type: "route", child: routeKey("GET", "/rbac/admins") },
  { parent: "admin.view", type: "route", child: routeKey("GET", "/rbac/assign") },
  { parent: "admin.view", type: "route", child: routeKey("GET", "/system/online") },
  { parent: "admin.view", type: "route", child: routeKey("GET", "/api/users") },
];

const MENUS: Omit<MenuDocument, "_id" | "createdAt" | "updatedAt">[] = [
  {
    key: "dashboard",
    parentKey: "",
    title: { "zh-CN": "仪表盘", "en-US": "Dashboard" },
    path: "/",
    icon: "home",
    sort: 0,
    status: "active",
  },
  {
    key: "workspace",
    parentKey: "",
    title: { "zh-CN": "工作台", "en-US": "Workspace" },
    path: "/workspace",
    icon: "grid",
    sort: 5,
    status: "active",
  },
  {
    key: "rbac",
    parentKey: "",
    title: { "zh-CN": "权限管理", "en-US": "Permission Management" },
    path: "",
    icon: "shield",
    sort: 80,
    status: "active",
  },
  {
    key: "rbac.admins",
    parentKey: "rbac",
    title: { "zh-CN": "管理员", "en-US": "Admins" },
    path: "/rbac/admins",
    icon: "star",
    sort: 10,
    status: "active",
  },
  {
    key: "rbac.assign",
    parentKey: "rbac",
    title: { "zh-CN": "权限分配", "en-US": "Assign" },
    path: "/rbac/assign",
    icon: "star",
    sort: 15,
    status: "active",
  },
  {
    key: "rbac.roles",
    parentKey: "rbac",
    title: { "zh-CN": "角色", "en-US": "Roles" },
    path: "/rbac/roles",
    icon: "star",
    sort: 20,
    status: "active",
  },
  {
    key: "rbac.permissions",
    parentKey: "rbac",
    title: { "zh-CN": "权限", "en-US": "Permissions" },
    path: "/rbac/permissions",
    icon: "star",
    sort: 30,
    status: "active",
  },
  {
    key: "rbac.routes",
    parentKey: "rbac",
    title: { "zh-CN": "路由", "en-US": "Routes" },
    path: "/rbac/routes",
    icon: "star",
    sort: 40,
    status: "active",
  },
  {
    key: "system",
    parentKey: "",
    title: { "zh-CN": "系统管理", "en-US": "System Management" },
    path: "",
    icon: "settings",
    sort: 90,
    status: "active",
  },
  {
    key: "system.region",
    parentKey: "system",
    title: { "zh-CN": "地区列表", "en-US": "Regions" },
    path: "/system/region",
    icon: "star",
    sort: 20,
    status: "active",
  },
  {
    key: "system.base",
    parentKey: "system",
    title: { "zh-CN": "基本设置", "en-US": "Base settings" },
    path: "/system/base",
    icon: "star",
    sort: 10,
    status: "active",
  },
  {
    key: "system.datetime",
    parentKey: "system",
    title: { "zh-CN": "时间设置", "en-US": "Datetime settings" },
    path: "/system/datetime",
    icon: "star",
    sort: 30,
    status: "active",
  },
  {
    key: "user",
    parentKey: "",
    title: { "zh-CN": "会员管理", "en-US": "Members" },
    path: "",
    icon: "users",
    sort: 60,
    status: "active",
  },
  {
    key: "user.index",
    parentKey: "user",
    title: { "zh-CN": "会员列表", "en-US": "Members" },
    path: "/user",
    icon: "star",
    sort: 10,
    status: "active",
  },
  {
    key: "user.active",
    parentKey: "user",
    title: { "zh-CN": "活跃会员", "en-US": "Active members" },
    path: "/user/active",
    icon: "star",
    sort: 20,
    status: "active",
  },
  {
    key: "user.zombie",
    parentKey: "user",
    title: { "zh-CN": "僵尸会员", "en-US": "Zombie members" },
    path: "/user/zombie",
    icon: "star",
    sort: 30,
    status: "active",
  },
  {
    key: "cms",
    parentKey: "",
    title: { "zh-CN": "内容管理", "en-US": "CMS" },
    path: "",
    icon: "book",
    sort: 70,
    status: "active",
  },
  {
    key: "cms.article",
    parentKey: "cms",
    title: { "zh-CN": "文章列表", "en-US": "Articles" },
    path: "/cms/article",
    icon: "star",
    sort: 10,
    status: "active",
  },
  {
    key: "cms.news",
    parentKey: "cms",
    title: { "zh-CN": "新闻列表", "en-US": "News" },
    path: "/cms/news",
    icon: "star",
    sort: 20,
    status: "active",
  },
  {
    key: "cms.notice",
    parentKey: "cms",
    title: { "zh-CN": "公告列表", "en-US": "Notices" },
    path: "/cms/notice",
    icon: "star",
    sort: 30,
    status: "active",
  },
  {
    key: "cms.photo",
    parentKey: "cms",
    title: { "zh-CN": "相册列表", "en-US": "Albums" },
    path: "/cms/photo",
    icon: "star",
    sort: 40,
    status: "active",
  },
  {
    key: "developer",
    parentKey: "",
    title: { "zh-CN": "开发管理", "en-US": "Development" },
    path: "",
    icon: "database",
    sort: 100,
    status: "active",
  },
  {
    key: "developer.menus",
    parentKey: "developer",
    title: { "zh-CN": "菜单管理", "en-US": "Menus" },
    path: "/developer/menus",
    icon: "star",
    sort: 5,
    status: "active",
  },
  {
    key: "developer.database",
    parentKey: "developer",
    title: { "zh-CN": "数据备份列表", "en-US": "DB backups" },
    path: "/developer/database",
    icon: "star",
    sort: 10,
    status: "active",
  },
  {
    key: "developer.feedback",
    parentKey: "developer",
    title: { "zh-CN": "问题反馈列表", "en-US": "Feedback" },
    path: "/developer/feedback",
    icon: "star",
    sort: 20,
    status: "active",
  },
  {
    key: "developer.language",
    parentKey: "developer",
    title: { "zh-CN": "系统语言列表", "en-US": "Languages" },
    path: "/developer/language",
    icon: "star",
    sort: 30,
    status: "active",
  },
  {
    key: "developer.system",
    parentKey: "developer",
    title: { "zh-CN": "系统日志列表", "en-US": "System logs" },
    path: "/developer/system",
    icon: "star",
    sort: 40,
    status: "active",
  },

]

/** Run the seed. Safe to call on every startup. */
export async function seedAll(): Promise<void> {
  await Promise.all([
    AdminUser.createIndexes(),
    AuthItem.createIndexes(),
    AuthItemChild.createIndexes(),
    AuthRoute.createIndexes(),
    Menu.createIndexes(),
    AdminSession.createIndexes(),
  ]);

  for (const i of ITEMS) {
    if (!await AuthItem.findOne({ name: i.name })) await AuthItem.create({ ...i, isSuper: !!i.isSuper });
  }
  // Every route that exists today becomes a managed (assignable) route on first run.
  for (const r of await scanRoutes()) {
    if (!await AuthRoute.findOne({ method: r.method, path: r.path })) {
      await AuthRoute.create({ ...r, source: "seed" });
    }
  }
  for (const c of CHILDREN) {
    if (!await AuthItemChild.findOne({ parent: c.parent, childType: c.type, child: c.child })) {
      await AuthItemChild.create({ parent: c.parent, childType: c.type, child: c.child });
    }
  }
  for (const m of MENUS) {
    const existing = await Menu.findOne({ key: m.key });
    if (!existing) await Menu.create(m);
    else {
      await Menu.updateById(String(existing._id), {
        title: m.title,
        path: m.path,
        parentKey: m.parentKey,
        icon: m.icon,
        sort: m.sort,
        status: m.status,
      });
    }
  }

  // Drop obsolete menus removed from MENUS (member/finance/count + system cull; menus → developer; cms qa/survey).
  const OBSOLETE_MENU_KEYS = [
    "cms.qa",
    "cms.survey",
    "count",
    "count.bonus",
    "count.invest",
    "count.point",
    "count.recharge",
    "count.withdraw",
    "finance",
    "finance.bonus",
    "finance.bonus-log",
    "finance.invest",
    "finance.point",
    "finance.recharge",
    "finance.wallet",
    "finance.wallet-add-sub",
    "finance.wallet-log",
    "finance.withdraw",
    "system.admin-log",
    "system.bonus",
    "system.express",
    "system.finance",
    "system.level",
    "system.locale",
    "system.menus",
    "system.online",
    "system.transfer",
    "system.wallet",
    "user.black",
    "user.location",
    "user.locked",
    "user.log",
    "user.new",
    "user.online",
    "user.path-invite",
    "user.path-position",
    "user.receipt",
    "user.upgrade-log",
  ];
  if (OBSOLETE_MENU_KEYS.length) {
    await Menu.deleteMany({ key: { $in: OBSOLETE_MENU_KEYS } });
  }

  const username = getEnv("SEED_ADMIN_USERNAME") || "admin";
  const password = getEnv("SEED_ADMIN_PASSWORD") || "admin888";
  if (!await AdminUser.findOne({ username })) {
    await AdminUser.create({
      username,
      password: await hashPassword(password),
      nickname: "Administrator",
      roleCodes: [SUPER_ROLE],
      status: "active",
    });
    console.log(`[dweb-admin] seeded default admin "${username}"`);
  }
  await invalidateRbacCache();
}
