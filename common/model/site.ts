/**
 * Site chrome saved from 系统管理 / 基本设置.
 * One row (`key: "base"`): full name in the sidebar, short label when collapsed.
 */
import { MongoModel } from "@dreamer/database";

export interface SiteSettingDocument {
  _id?: string;
  key: string;
  website: string;
  shortName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SiteSetting extends MongoModel {
  static override collectionName = "site_settings";
  static override timestamps = true;
  static override indexes = [{ field: "key", unique: true }];
}
