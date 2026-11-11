/**
 * Map resource key → view / write named permissions (seed packs).
 * Pure module: safe for client bundles (no rbac/database imports).
 */
export function resourcePerms(key: string): { view: string; write: string } {
  if (key === "admins" || key === "online" || key === "assign") {
    return { view: "admin.view", write: "admin.write" };
  }
  if (key === "roles" || key === "permissions" || key === "routes") {
    return { view: "rbac.view", write: "rbac.write" };
  }
  if (key === "menus" || key.startsWith("developer.")) {
    return { view: "developer.view", write: "developer.write" };
  }
  if (key.startsWith("system.")) {
    return { view: "system.view", write: "system.write" };
  }
  if (key.startsWith("user.")) {
    return { view: "user.view", write: "user.write" };
  }
  if (key.startsWith("cms.")) {
    return { view: "cms.view", write: "cms.write" };
  }
  return { view: "admin.view", write: "admin.write" };
}
