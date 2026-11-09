/**
 * Auth caps for DataPanel (create/update/view/remove/batch/import/export).
 *
 * Data flow (1 minute):
 *   me.roleCodes → canAccessStrict(POST /api/res/<key>) → resolveResourceCaps
 *   → meta.caps → admin DataPanel → ui-view buttons (visibility = caps only).
 *
 * Chrome caps (print/columns/density/fullscreen/copy) are NOT auth — see CHROME_CAPS.
 */
import type { ResourceDef, ResourceMeta } from "./types.ts";
import { CHROME_CAPS } from "./chrome-caps.ts";

export { CHROME_CAPS };

export type AuthCaps = ResourceMeta["caps"];

/** User fields loadPanel already has when resolving caps. */
export type CapsUser = {
  roleCodes: string[];
  isSuper?: boolean;
};

type CapSource = Pick<
  ResourceDef,
  "key" | "create" | "update" | "remove" | "view" | "setField" | "statusField" | "importRows"
>;

/** Static caps from the resource definition (before role trim). */
export function staticAuthCaps(def: CapSource): AuthCaps {
  return {
    create: !!def.create,
    update: !!def.update,
    // view defaults on unless ResourceDef.view === false
    view: def.view !== false,
    remove: !!def.remove,
    batchStatus: !!(def.setField && def.statusField),
    import: !!def.importRows,
    // export follows view: readers may download what they can list (not a write grant)
    export: true,
  };
}

/**
 * ItemAdmin resources (roles/permissions) have no def.create/update handlers —
 * the custom modal owns writes — but list buttons still need create/update when
 * the caller may POST /api/res/<key>.
 */
function withItemAdminSynthetic(caps: AuthCaps, key: string, canWrite: boolean): AuthCaps {
  if (!canWrite) return caps;
  if (key === "roles" || key === "permissions") {
    return { ...caps, create: true, update: true, view: true };
  }
  return caps;
}

/**
 * Resolve per-user auth caps for a resource.
 *
 * - Super → static caps + ItemAdmin synthetic (full write UI).
 * - Else write grant = canAccessStrict(POST /api/res/<key>) (same token authorize() uses):
 *     create / update / remove / batchStatus / import ← require write
 *     view / export ← keep static (page already GET-gated; export is not write)
 *
 * Named *.import / *.export / *.batch permissions are NOT seeded: write/view packs
 * already name the human intent; splitting would add N×3 noise without a second consumer.
 */
export async function resolveResourceCaps(
  user: CapsUser,
  def: CapSource,
): Promise<AuthCaps> {
  const base = staticAuthCaps(def);
  const isSuper = !!user.isSuper;
  // Dynamic import: keep rbac/database out of the client chunk that only needs CHROME_CAPS.
  const { canAccessStrict } = await import("@common/service/rbac.ts");
  const canWrite = isSuper ||
    await canAccessStrict(user.roleCodes ?? [], "POST", `/api/res/${def.key}`);

  if (!canWrite) {
    return {
      ...base,
      create: false,
      update: false,
      remove: false,
      batchStatus: false,
      import: false,
      // view + export stay: read-only panel
    };
  }
  return withItemAdminSynthetic(base, def.key, true);
}

/** @deprecated Use resolveResourceCaps — kept for a short migration window in tests. */
export function trimCapsForWrite(
  caps: AuthCaps,
  canWrite: boolean,
  key: string,
): AuthCaps {
  const next = { ...caps };
  if (!canWrite) {
    next.create = false;
    next.update = false;
    next.remove = false;
    next.batchStatus = false;
    next.import = false;
    return next;
  }
  return withItemAdminSynthetic(next, key, true);
}
