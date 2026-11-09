/**
 * CRUD for users / roles / menus used by the /api routes.
 * Every write that can change authorization calls invalidateRbacCache().
 * The last active super-admin user can never be removed/disabled/demoted.
 * Functions return { ok: true, ... } or { ok: false, error: <i18n error code> }.
 */
import { array, number, object, string } from "@dreamer/utils/validator";
import {
  AdminSession,
  AdminUser,
  type AdminUserDocument,
  AuthItem,
  type AuthItemDocument,
  Menu,
  type MenuDocument,
} from "@common/model/mod.ts";
import { hashPassword } from "@common/service/password.ts";
import { loadGraph, resolveGrants } from "@common/service/rbac.ts";
import { parseBody } from "@common/utils/validate.ts";

export type Fail = { ok: false; error: string; fields?: string[] };
export type Ok<T extends object = object> = { ok: true } & T;

export interface Page {
  page: number;
  pageSize: number;
  keyword: string;
}

/** Parse ?page&pageSize&keyword with sane bounds. */
export function readPage(url: URL): Page {
  const n = (k: string, d: number) => {
    const v = Number.parseInt(url.searchParams.get(k) ?? "", 10);
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  return {
    page: n("page", 1),
    pageSize: Math.min(n("pageSize", 10), 100),
    keyword: (url.searchParams.get("keyword") ?? "").trim().slice(0, 64),
  };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STATUS = ["active", "disabled"];

// ---------------------------------------------------------------- helpers

/** True when a set of role names resolves to a super role (directly or via nesting). */
async function isSuperSet(roleNames: string[]): Promise<boolean> {
  return resolveGrants(await loadGraph(), roleNames).isSuper;
}

/** Active users that hold a super role, optionally ignoring one user. */
async function superUsers(exceptId?: string): Promise<AdminUserDocument[]> {
  const graph = await loadGraph();
  const users = (await AdminUser.findAll({ status: "active" })) as unknown as AdminUserDocument[];
  return users.filter((u) =>
    String(u._id) !== exceptId && resolveGrants(graph, u.roleCodes ?? []).isSuper
  );
}

// ------------------------------------------------------------------ users

const userSchema = {
  nickname: string().optional().max(64),
  email: string().optional().max(128),
  password: string().optional().max(64),
  roleCodes: array(string()).optional(),
  status: string().optional(),
};

export type UserListQuery = Page & {
  /** Vue admin search: username / email / status (active|disabled). */
  username?: string;
  email?: string;
  status?: string;
};

export async function listUsers(q: UserListQuery) {
  const and: Record<string, unknown>[] = [];
  if (q.keyword) {
    and.push({
      $or: [
        { username: { $regex: escapeRe(q.keyword), $options: "i" } },
        { nickname: { $regex: escapeRe(q.keyword), $options: "i" } },
        { email: { $regex: escapeRe(q.keyword), $options: "i" } },
      ],
    });
  }
  const uname = (q.username ?? "").trim().slice(0, 64);
  if (uname) and.push({ username: { $regex: escapeRe(uname), $options: "i" } });
  const email = (q.email ?? "").trim().slice(0, 128);
  if (email) and.push({ email: { $regex: escapeRe(email), $options: "i" } });
  const st = (q.status ?? "").trim();
  if (st === "active" || st === "disabled") and.push({ status: st });
  const where = and.length === 0 ? {} : and.length === 1 ? and[0]! : { $and: and };
  const r = await AdminUser.paginate(where as never, q.page, q.pageSize, { username: 1 });
  return {
    items: (r.data as unknown as AdminUserDocument[]).map((u) => ({
      id: String(u._id),
      username: u.username,
      nickname: u.nickname,
      email: u.email ?? "",
      roleCodes: u.roleCodes ?? [],
      status: u.status,
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : "",
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : "",
    })),
    total: r.total,
    page: r.page,
    pageSize: r.pageSize,
  };
}

async function knownRoles(codes: string[]): Promise<boolean> {
  if (codes.length === 0) return true;
  const roles = (await AuthItem.findAll({ type: "role" })) as unknown as AuthItemDocument[];
  const have = new Set(roles.map((r) => r.name));
  return codes.every((c) => have.has(c));
}

export async function createUser(body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(
    body,
    object({
      username: string().required().min(2).max(32).pattern(/^[A-Za-z][A-Za-z0-9_]*$/),
      ...userSchema,
      password: string().required().min(6).max(64),
    }),
  );
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const d = parsed.data as Record<string, unknown>;
  const roleCodes = (d.roleCodes as string[] | undefined) ?? [];
  const status = (d.status as string) || "active";
  if (!STATUS.includes(status) || !await knownRoles(roleCodes)) return { ok: false, error: "invalid" };
  if (await AdminUser.findOne({ username: d.username as string })) {
    return { ok: false, error: "usernameExists", fields: ["username"] };
  }
  await AdminUser.create({
    username: d.username,
    password: await hashPassword(d.password as string),
    nickname: (d.nickname as string)?.trim() || d.username,
    email: (d.email as string) ?? "",
    roleCodes,
    status,
  });
  return { ok: true };
}

export async function updateUser(id: string, body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(body, object({ ...userSchema }));
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const d = parsed.data as Record<string, unknown>;
  const user = await AdminUser.findOne({ _id: id }) as AdminUserDocument | null;
  if (!user) return { ok: false, error: "notFound" };
  const patch: Record<string, unknown> = {};
  if (d.nickname !== undefined) patch.nickname = (d.nickname as string).trim() || user.username;
  if (d.email !== undefined) patch.email = d.email;
  if (d.password) {
    if ((d.password as string).length < 6) return { ok: false, error: "invalid", fields: ["password"] };
    patch.password = await hashPassword(d.password as string);
  }
  if (d.roleCodes !== undefined) {
    if (!await knownRoles(d.roleCodes as string[])) return { ok: false, error: "invalid" };
    patch.roleCodes = d.roleCodes;
  }
  if (d.status !== undefined) {
    if (!STATUS.includes(d.status as string)) return { ok: false, error: "invalid" };
    patch.status = d.status;
  }
  // Protect the last super admin: after this change someone else must remain.
  const nextRoles = (patch.roleCodes as string[] | undefined) ?? user.roleCodes ?? [];
  const nextStatus = (patch.status as string | undefined) ?? user.status;
  const staysSuper = nextStatus === "active" && await isSuperSet(nextRoles);
  const wasSuper = user.status === "active" && await isSuperSet(user.roleCodes ?? []);
  if (wasSuper && !staysSuper && (await superUsers(id)).length === 0) {
    return { ok: false, error: "lastSuperAdmin" };
  }
  await AdminUser.updateById(id, patch);
  if (patch.status === "disabled" || patch.password || patch.roleCodes) {
    await AdminSession.deleteMany({ userId: id });
  }
  return { ok: true };
}

export async function deleteUser(id: string, currentUserId: string): Promise<Ok | Fail> {
  if (id === currentUserId) return { ok: false, error: "cannotDeleteSelf" };
  const user = await AdminUser.findOne({ _id: id }) as AdminUserDocument | null;
  if (!user) return { ok: false, error: "notFound" };
  const isSuper = user.status === "active" && await isSuperSet(user.roleCodes ?? []);
  if (isSuper && (await superUsers(id)).length === 0) return { ok: false, error: "lastSuperAdmin" };
  await AdminSession.deleteMany({ userId: id });
  await AdminUser.deleteById(id);
  return { ok: true };
}

// ------------------------------------------------------------------ menus

const menuSchema = {
  parentKey: string().optional().max(64),
  title: object({ "zh-CN": string().optional().max(64), "en-US": string().optional().max(64) }),
  path: string().optional().max(200),
  permission: string().optional().max(64),
  icon: string().optional().max(32),
  sort: number().optional(),
  status: string().optional(),
};

export async function listAllMenus() {
  const rows = (await Menu.findAll({}, undefined, { sort: { sort: 1 } })) as unknown as MenuDocument[];
  return rows
    .sort((a, b) => (a.sort - b.sort) || a.key.localeCompare(b.key))
    .map((m) => ({
      key: m.key,
      parentKey: m.parentKey ?? "",
      title: m.title ?? {},
      path: m.path ?? "",
      permission: m.permission ?? "",
      icon: m.icon ?? "menu",
      sort: m.sort ?? 0,
      status: m.status,
    }));
}

async function checkParent(key: string, parentKey: string): Promise<string | null> {
  if (!parentKey) return null;
  if (parentKey === key) return "invalid";
  const parent = await Menu.findOne({ key: parentKey }) as MenuDocument | null;
  if (!parent) return "invalid";
  if (parent.parentKey) return "onlyTwoLevels";
  return null;
}

export async function createMenu(body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(
    body,
    object({ key: string().required().pattern(/^[a-z][a-z0-9_.-]{0,63}$/), ...menuSchema }),
  );
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const d = parsed.data as Record<string, unknown>;
  const key = d.key as string;
  if (await Menu.findOne({ key })) return { ok: false, error: "menuExists", fields: ["key"] };
  const parentKey = (d.parentKey as string) ?? "";
  const bad = await checkParent(key, parentKey);
  if (bad) return { ok: false, error: bad, fields: ["parentKey"] };
  const status = (d.status as string) || "active";
  if (!STATUS.includes(status)) return { ok: false, error: "invalid" };
  await Menu.create({
    key,
    parentKey,
    title: { "zh-CN": "", "en-US": "", ...(d.title as object) },
    path: (d.path as string) ?? "",
    permission: String(d.permission ?? "").trim(),
    icon: (d.icon as string) || "menu",
    sort: (d.sort as number) ?? 100,
    status,
  });
  return { ok: true };
}

export async function updateMenu(key: string, body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(body, object({ ...menuSchema }));
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const d = parsed.data as Record<string, unknown>;
  const menu = await Menu.findOne({ key }) as MenuDocument | null;
  if (!menu) return { ok: false, error: "notFound" };
  const patch: Record<string, unknown> = {};
  if (d.parentKey !== undefined) {
    const parentKey = d.parentKey as string;
    const bad = await checkParent(key, parentKey);
    if (bad) return { ok: false, error: bad, fields: ["parentKey"] };
    // a node with children cannot itself become a child (max two levels)
    if (parentKey && await Menu.findOne({ parentKey: key })) {
      return { ok: false, error: "onlyTwoLevels", fields: ["parentKey"] };
    }
    patch.parentKey = parentKey;
  }
  if (d.title) patch.title = { ...menu.title, ...(d.title as object) };
  for (const f of ["path", "icon", "sort"] as const) if (d[f] !== undefined) patch[f] = d[f];
  if (d.permission !== undefined) patch.permission = String(d.permission ?? "").trim();
  if (d.status !== undefined) {
    if (!STATUS.includes(d.status as string)) return { ok: false, error: "invalid" };
    patch.status = d.status;
  }
  await Menu.updateById(String(menu._id), patch);
  return { ok: true };
}

export async function deleteMenu(key: string): Promise<Ok | Fail> {
  const menu = await Menu.findOne({ key }) as MenuDocument | null;
  if (!menu) return { ok: false, error: "notFound" };
  if (await Menu.findOne({ parentKey: key })) return { ok: false, error: "hasChildren" };
  await Menu.deleteById(String(menu._id));
  return { ok: true };
}
