/**
 * Call-site helpers for DataPanel toolbar / rowActions.
 * show = caller ?? caps[key]: pass `undefined` to keep SSR caps, `false` to force-hide.
 */
import { can } from "./can.ts";

/** When allowed, fall back to caps; otherwise force-hide. */
export function capGate(allow: boolean): false | undefined {
  return allow ? undefined : false;
}

/** Map resource key → view / write named permissions (seed packs). */
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

/** Declarative toolbar/rowActions from mePerms + resource key (gates only; caps remain default). */
export function resourcePanelActions(key: string) {
  const { view, write } = resourcePerms(key);
  const canView = can(view) || can(write);
  const canWrite = can(write);
  return {
    toolbar: {
      create: capGate(canWrite),
      // batchStatus is NOT a toolbar key in ui-view@1.2.8 — gated via caps.batchStatus only.
      import: capGate(canWrite),
      export: capGate(canView),
      // chrome / search / refresh: omit → caps / defaults
    },
    rowActions: {
      view: capGate(canView),
      edit: capGate(canWrite),
      remove: capGate(canWrite),
    },
  };
}
