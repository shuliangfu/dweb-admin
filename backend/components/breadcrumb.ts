/**
 * Build breadcrumb crumbs from the DB menu tree + current pathname.
 * Mirrors Vue TopHeader's findRouteChain: parent group (no link) + leaf.
 */
import type { MenuNode } from "@common/service/menu.ts";
import type { BreadcrumbItem } from "@dreamer/ui-view";

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

/** Crumbs for ui-view Breadcrumb (parent groups have no href). */
export function buildBreadcrumb(
  tree: MenuNode[],
  pathname: string,
): BreadcrumbItem[] {
  for (const node of tree) {
    if (node.children.length === 0) {
      if (isActive(pathname, node.path)) {
        return [{ label: node.title }];
      }
      continue;
    }
    for (const child of node.children) {
      if (isActive(pathname, child.path)) {
        return [
          { label: node.title },
          { label: child.title },
        ];
      }
    }
    if (node.path && isActive(pathname, node.path)) {
      return [{ label: node.title }];
    }
  }
  return [];
}
