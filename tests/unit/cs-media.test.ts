import { describe, expect, it } from "@dreamer/test";
import {
  isAllowedCsMediaUrl,
  previewForKind,
  roomOf,
} from "../../common/service/cs.ts";

describe("cs rich media helpers", () => {
  it("allows sticker and session-scoped upload urls", () => {
    const sid = "abc12345XYZ9";
    expect(isAllowedCsMediaUrl("sticker:wave", sid)).toBe(true);
    // 新前缀 chat/
    expect(isAllowedCsMediaUrl(`/ui-view-upload/file?key=chat/${sid}/x.png`, sid)).toBe(true);
    expect(isAllowedCsMediaUrl(`http://127.0.0.1:8813/ui-view-upload/file?key=chat/${sid}/a.jpg`, sid)).toBe(true);
    expect(isAllowedCsMediaUrl(`/ui-view-upload/file?key=chat/other/x.png`, sid)).toBe(false);
    expect(isAllowedCsMediaUrl("https://evil.test/ui-view-upload/file?key=chat/"+sid+"/x.png", sid)).toBe(true);
    // 过渡：旧 key 前缀 cs/ 与 legacy /upload/file 仍认
    expect(isAllowedCsMediaUrl(`/ui-view-upload/file?key=cs/${sid}/old.png`, sid)).toBe(true);
    expect(isAllowedCsMediaUrl(`/upload/file?key=cs/${sid}/legacy.png`, sid)).toBe(true);
    expect(isAllowedCsMediaUrl(`/upload/file?key=chat/${sid}/legacy.png`, sid)).toBe(true);
  });

  it("previewForKind labels", () => {
    expect(previewForKind("image", "", undefined)).toBe("[图片]");
    expect(previewForKind("voice", "", undefined)).toBe("[语音]");
    expect(previewForKind("file", "", { url: "u", mime: "a", name: "a.pdf" })).toContain("a.pdf");
    expect(roomOf("abc12345XYZ9")).toBe("cs:abc12345XYZ9");
  });
});
