import { assertEquals } from "@std/assert";
import { parseSessionId, roomOf } from "@common/service/cs.ts";

Deno.test("cs roomOf / parseSessionId round trip", () => {
  const id = "abc12345XYZ";
  assertEquals(roomOf(id), "cs:abc12345XYZ");
  assertEquals(parseSessionId(roomOf(id)), id);
});

Deno.test("cs parseSessionId rejects bad rooms", () => {
  assertEquals(parseSessionId("market:x"), null);
  assertEquals(parseSessionId("cs:"), null);
  assertEquals(parseSessionId("cs:short"), null);
  assertEquals(parseSessionId("cs:bad id!!"), null);
});
