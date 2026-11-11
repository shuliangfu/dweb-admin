import { describe, expect, it } from "@dreamer/test";
import {
  itemDescription,
  itemDescKey,
  namesMatchingItemDesc,
  SEEDED_ITEM_NAMES,
} from "../../common/i18n/item-desc.ts";

describe("itemDescription (seeded RBAC copy)", () => {
  it("translates seed English to zh-CN for every built-in item", () => {
    const samples: Record<string, string> = {
      "admin.view": "查看管理员、分配与在线状态",
      "admin.write": "新建、更新、删除管理员",
      "cms.view": "查看内容列表",
      "cs.claim": "认领客服会话",
      super_admin: "超级管理员：拥有全部权限",
      operator: "运营：只读及客服（不可删除会话）",
      cs_agent: "客服坐席",
    };
    for (const [name, zh] of Object.entries(samples)) {
      expect(itemDescription(name, itemDescription(name, "", "en-US"), "zh-CN")).toBe(zh);
    }
    for (const name of SEEDED_ITEM_NAMES) {
      const en = itemDescription(name, "", "en-US");
      const zh = itemDescription(name, en, "zh-CN");
      expect(zh === en).toBe(false);
      expect(zh.includes("rbac.itemDesc")).toBe(false);
    }
  });

  it("keeps English locale on the seed wording", () => {
    expect(itemDescription("admin.view", "View administrators / assign / online", "en-US"))
      .toBe("View administrators / assign / online");
    expect(itemDescription("cs.claim", "Claim CS sessions", "en-US")).toBe("Claim CS sessions");
  });

  it("falls back to stored text for unknown names", () => {
    expect(itemDescription("custom.role", "My custom role", "zh-CN")).toBe("My custom role");
  });

  it("localizes seeded names even when the stored English wording is an older seed variant", () => {
    expect(itemDescription("admin.view", "View administrators", "zh-CN")).toBe("查看管理员、分配与在线状态");
    expect(itemDescription("operator", "Operator: read-only access to the admin list", "zh-CN"))
      .toBe("运营：只读及客服（不可删除会话）");
  });

  it("treats empty stored text as canonical and localizes it", () => {
    expect(itemDescription("cms.view", "", "zh-CN")).toBe("查看内容列表");
  });

  it("matches Chinese description search to seeded names", () => {
    const names = namesMatchingItemDesc("认领客服", "zh-CN");
    expect(names.includes("cs.claim")).toBe(true);
    expect(itemDescKey("cs.claim")).toBe("rbac.itemDesc.cs.claim");
  });
});
