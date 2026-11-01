/**
 * Sidebar menu stored in the database. Two levels: parentKey "" = top level.
 * Visibility for a user is derived from RBAC (role has GET on `path`).
 */
import { MongoModel } from "@dreamer/database";

export interface MenuDocument {
  _id?: string;
  /** Unique stable key, e.g. "system" / "system.users". */
  key: string;
  /** "" for a top level item, otherwise the parent's key. */
  parentKey: string;
  /** Titles per locale, e.g. { "zh-CN": "用户管理", "en-US": "Users" }. */
  title: Record<string, string>;
  /** Page path; empty for a pure group node. */
  path: string;
  /** Icon name understood by the SideMenu component. */
  icon: string;
  sort: number;
  status: "active" | "disabled";
  createdAt?: Date;
  updatedAt?: Date;
}

export class Menu extends MongoModel {
  static override collectionName = "menus";
  static override timestamps = true;
  static override indexes = [{ field: "key", unique: true }, {
    field: "parentKey",
  }];
}
