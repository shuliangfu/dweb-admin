/**
 * Resolve the current page title from the menu tree (TagView label).
 */
import type { MenuNode } from "@common/service/menu.ts";

function isActive(pathname: string, path: string): boolean {
  if (!path) return false;
  return path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(path + "/");
}

/** Resolve the visible title for the current path (TagView label). */
export function resolvePageTitle(
  tree: MenuNode[],
  pathname: string,
  fallback: string,
): string {
  for (const node of tree) {
    if (node.children.length === 0) {
      if (isActive(pathname, node.path)) return node.title;
      continue;
    }
    for (const child of node.children) {
      if (isActive(pathname, child.path)) return child.title;
    }
    if (node.path && isActive(pathname, node.path)) return node.title;
  }
  return fallback;
}
