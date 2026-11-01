/**
 * RBAC models (Yii2 style): items = roles + permissions, an item graph, and a route registry.
 *
 *   Role       may contain: roles, permissions, routes
 *   Permission may contain: permissions, routes
 *   Route      = HTTP method + path pattern (wildcards: "/*", "/admin/*", "*" / ":id" segment)
 */
import { MongoModel } from "@dreamer/database";

export type ItemType = "role" | "permission";
export type ChildType = "role" | "permission" | "route";
/** HTTP methods a route binding may name; "*" means any method. */
export type RouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "*";

export interface AuthItemDocument {
  _id?: string;
  /** Unique identifier within roles+permissions, e.g. "super_admin". */
  name: string;
  type: ItemType;
  description?: string;
  /** Yii2-compatible "rule name" (informational; not evaluated yet). */
  ruleName?: string;
  /** Free-form data (informational). */
  data?: string;
  /** Super roles bypass route checks (role only; seed/DB-only, never set via API). */
  isSuper?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AuthItem extends MongoModel {
  static override collectionName = "auth_items";
  static override timestamps = true;
  static override indexes = [{ field: "name", unique: true }, { field: "type" }];
}

export interface AuthItemChildDocument {
  _id?: string;
  parent: string;
  childType: ChildType;
  /** Item name for role/permission children; "METHOD path" key for routes. */
  child: string;
}

export class AuthItemChild extends MongoModel {
  static override collectionName = "auth_item_children";
  static override timestamps = true;
  static override indexes = [
    { fields: { parent: 1, childType: 1, child: 1 }, unique: true },
    { field: "parent" },
  ];
}

export interface AuthRouteDocument {
  _id?: string;
  method: RouteMethod;
  path: string;
  /** Where it came from: typed in by an admin, or accepted from a scan. */
  source: "manual" | "scan" | "seed";
}

/** Routes that are *managed* (assignable to roles/permissions). */
export class AuthRoute extends MongoModel {
  static override collectionName = "auth_routes";
  static override timestamps = true;
  static override indexes = [{ fields: { method: 1, path: 1 }, unique: true }];
}

/** "GET /api/users" ⇄ { method, path } */
export function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

export function parseRouteKey(key: string): { method: RouteMethod; path: string } | null {
  const m = key.match(/^(GET|POST|PUT|PATCH|DELETE|\*) (\/\S*)$/);
  return m ? { method: m[1] as RouteMethod, path: m[2] } : null;
}
