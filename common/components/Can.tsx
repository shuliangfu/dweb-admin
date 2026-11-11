/**
 * Lightweight permission gate: no permission → do not render children.
 * Prefer ui-view primitives inside children; this only gates visibility.
 */
import type { JSXRenderable } from "@dreamer/view";
import { can, canAny, mePerms } from "@common/hook/can.ts";

export function Can(props: {
  permission: string | string[];
  /** Align with ui-view / AuthShell: Button 等返回 `JSXRenderable`，不能只收 `VNode`。 */
  children?: JSXRenderable | (() => JSXRenderable);
  fallback?: JSXRenderable;
}): JSXRenderable {
  // Track hydrated permissions for reactive re-render.
  void mePerms.value;
  const p = props.permission;
  const ok = Array.isArray(p) ? canAny(...p) : can(p);
  if (!ok) return props.fallback ?? null;
  const ch = props.children;
  // VNode is `() => unknown`; cast so JSX accepts Can as a component.
  if (typeof ch === "function") return ch() as JSXRenderable;
  return (ch ?? null) as JSXRenderable;
}
