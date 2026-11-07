/**
 * Lightweight permission gate: no permission → do not render children.
 * Prefer ui-view primitives inside children; this only gates visibility.
 */
import type { VNode } from "@dreamer/view";
import { can, canAny, mePerms } from "@common/hook/can.ts";

export function Can(props: {
  permission: string | string[];
  children?: VNode | VNode[] | (() => VNode | VNode[] | null) | null;
  fallback?: VNode | VNode[] | null;
}) {
  // Track hydrated permissions for reactive re-render.
  void mePerms.value;
  const p = props.permission;
  const ok = Array.isArray(p) ? canAny(...p) : can(p);
  if (!ok) return props.fallback ?? null;
  const ch = props.children;
  if (typeof ch === "function") return ch();
  return ch ?? null;
}
