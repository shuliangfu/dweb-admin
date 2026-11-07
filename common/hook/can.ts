/**
 * Client-side permission gate. Hydrate via setMePermissions (layout bootstrap)
 * or fetch /api/auth/me. Super → all; otherwise exact permission name match.
 */
import { createSignal } from "@dreamer/view";

export type MePermissions = {
  permissions: string[];
  isSuper: boolean;
  loaded: boolean;
};

export const mePerms = createSignal<MePermissions>({
  permissions: [],
  isSuper: false,
  loaded: false,
});

export function setMePermissions(p: { permissions: string[]; isSuper: boolean }): void {
  mePerms.value = {
    permissions: [...(p.permissions ?? [])],
    isSuper: !!p.isSuper,
    loaded: true,
  };
}

/** Sync check against hydrated mePerms (super → true). */
export function can(name: string): boolean {
  const m = mePerms.value;
  if (m.isSuper) return true;
  return m.permissions.includes(name);
}

export function canAny(...names: string[]): boolean {
  return names.some((n) => can(n));
}
