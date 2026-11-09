/** Generic resource API (/api/res): pagination, sort, search, export (real xlsx), batch, inline edit, validation, remove. */
import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { Api, adminApi, ensureServer, makeUser, removeUser } from "../helpers.ts";

const OPTS = { sanitizeOps: false, sanitizeResources: false };
const RES = "cms.article";
const TAG = `rt${Date.now().toString(36)}`; // unique marker so the suite never depends on existing rows

async function seed(api: Api, n: number): Promise<string[]> {
  for (let i = 1; i <= n; i++) {
    const r = await api.post("/api/res/create", { res: RES, category: `${TAG}-c${i % 3}`, title: `${TAG}-title-${String(i).padStart(2, "0")}`, source: "test", visits: i * 10 });
    assertEquals(r.status, 201, JSON.stringify(r.data));
  }
  const l = await api.get(`/api/res?res=${RES}&title=${TAG}&pageSize=100`);
  return l.data.rows.map((x: { id: string }) => x.id);
}
async function cleanup(api: Api) {
  const l = await api.get(`/api/res?res=${RES}&title=${TAG}&pageSize=100`);
  const ids = l.data.rows.map((x: { id: string }) => x.id);
  if (ids.length) await api.post("/api/res/remove", { res: RES, ids });
}

Deno.test({ name: "res: server-side pagination (page, pageSize, total) and stable ordering", ...OPTS, fn: async () => {
  const api = await adminApi();
  try {
    await seed(api, 23);
    const p1 = await api.get(`/api/res?res=${RES}&title=${TAG}&page=1&pageSize=10&sort=visits&order=asc`);
    const p3 = await api.get(`/api/res?res=${RES}&title=${TAG}&page=3&pageSize=10&sort=visits&order=asc`);
    assertEquals(p1.data.total, 23);
    assertEquals(p1.data.rows.length, 10);
    assertEquals(p3.data.rows.length, 3);
    assertEquals(p1.data.rows[0].visits, 10);
    assertEquals(p3.data.rows[2].visits, 230);
    assertEquals(p1.data.query.pageSize, 10);
    // page size is clamped, never unbounded
    const huge = await api.get(`/api/res?res=${RES}&title=${TAG}&pageSize=100000`);
    assert(huge.data.rows.length <= 500);
    // out-of-range page → empty rows but correct total
    const far = await api.get(`/api/res?res=${RES}&title=${TAG}&page=99&pageSize=10`);
    assertEquals(far.data.rows.length, 0);
    assertEquals(far.data.total, 23);
  } finally {
    await cleanup(api);
  }
} });

Deno.test({ name: "res: sorting asc/desc on text and number columns; unknown sort field is ignored", ...OPTS, fn: async () => {
  const api = await adminApi();
  try {
    await seed(api, 8);
    const asc = (await api.get(`/api/res?res=${RES}&title=${TAG}&sort=visits&order=asc`)).data.rows.map((r: any) => r.visits);
    const desc = (await api.get(`/api/res?res=${RES}&title=${TAG}&sort=visits&order=desc`)).data.rows.map((r: any) => r.visits);
    assertEquals(asc, [...asc].sort((a, b) => a - b));
    assertEquals(desc, [...asc].reverse());
    const titles = (await api.get(`/api/res?res=${RES}&title=${TAG}&sort=title&order=desc`)).data.rows.map((r: any) => r.title);
    assertEquals(titles, [...titles].sort().reverse());
    const bad = await api.get(`/api/res?res=${RES}&title=${TAG}&sort=__proto__$bad&order=asc`);
    assertEquals(bad.status, 200);
  } finally {
    await cleanup(api);
  }
} });

Deno.test({ name: "res: search — regex fields are escaped, numeric match, select match, combined filters", ...OPTS, fn: async () => {
  const api = await adminApi();
  try {
    await seed(api, 9);
    const byCat = await api.get(`/api/res?res=${RES}&title=${TAG}&category=${TAG}-c1`);
    assertEquals(byCat.data.total, 3); // i%3==1 → 1,4,7
    const byVisits = await api.get(`/api/res?res=${RES}&title=${TAG}&visits=40`);
    assertEquals(byVisits.data.total, 1);
    const both = await api.get(`/api/res?res=${RES}&title=${TAG}&category=${TAG}-c0&visits=30`);
    assertEquals(both.data.total, 1);
    // regex metacharacters are literal, not a pattern (and don't crash)
    const meta = await api.get(`/api/res?res=${RES}&title=${encodeURIComponent(".*")}`);
    assertEquals(meta.status, 200);
    assertEquals(meta.data.rows.filter((r: any) => !String(r.title).includes(".*")).length, 0);
    const none = await api.get(`/api/res?res=${RES}&title=${TAG}-nothing`);
    assertEquals(none.data.total, 0);
  } finally {
    await cleanup(api);
  }
} });

Deno.test({ name: "res: validation — required/number/max errors come back per field and nothing is stored", ...OPTS, fn: async () => {
  const api = await adminApi();
  const r = await api.post("/api/res/create", { res: RES, title: "", visits: "abc" });
  assertEquals(r.status, 400);
  assert(r.data.fields.includes("category") || r.data.fields.includes("title"), JSON.stringify(r.data));
  assert(r.data.fields.includes("visits"));
  assertEquals(typeof r.data.messages.visits, "string");
  const long = await api.post("/api/res/create", { res: RES, category: "x".repeat(600), title: `${TAG}-long` });
  assertEquals(long.status, 400);
  assertEquals((await api.get(`/api/res?res=${RES}&title=${TAG}-long`)).data.total, 0);
  const unknown = await api.post("/api/res/create", { res: "no.such", title: "x" });
  assertEquals(unknown.status, 404);
} });

Deno.test({ name: "res: update, inline field edit and batch status", ...OPTS, fn: async () => {
  const api = await adminApi();
  try {
    const ids = await seed(api, 4);
    const up = await api.post("/api/res/update", { res: RES, id: ids[0], category: `${TAG}-upd`, title: `${TAG}-renamed`, visits: 7 });
    assertEquals(up.status, 200, JSON.stringify(up.data));
    const one = await api.get(`/api/res/get?res=${RES}&id=${ids[0]}`);
    assertEquals(one.data.row.title, `${TAG}-renamed`);
    assertEquals(one.data.row.visits, 7);
    // inline edit
    const f = await api.post("/api/res/field", { res: RES, id: ids[1], field: "visits", value: 999 });
    assertEquals(f.status, 200, JSON.stringify(f.data));
    assertEquals((await api.get(`/api/res/get?res=${RES}&id=${ids[1]}`)).data.row.visits, 999);
    // a field that is not inline-editable is refused
    const refused = await api.post("/api/res/field", { res: RES, id: ids[1], field: "title", value: "hacked" });
    assertNotEquals(refused.status, 200);
    // update of a missing id
    const missing = await api.post("/api/res/update", { res: RES, id: "000000000000000000000000", category: "x", title: "y" });
    assertEquals(missing.status, 404);
  } finally {
    await cleanup(api);
  }
} });

Deno.test({ name: "res: batch status on the member list changes every selected row; invalid status is refused", ...OPTS, fn: async () => {
  const api = await adminApi();
  const tag = `bs${Date.now().toString(36)}`;
  try {
    for (let i = 0; i < 3; i++) await api.post("/api/res/create", { res: "user.index", username: `${tag}_${i}`, email: `${tag}_${i}@example.com`, status: "active" });
    const list = await api.get(`/api/res?res=user.index&username=${tag}`);
    const ids: string[] = list.data.rows.map((r: any) => r.id);
    assertEquals(ids.length, 3);
    const ok = await api.post("/api/res/field", { res: "user.index", ids, field: "status", value: "disabled" });
    assertEquals(ok.status, 200, JSON.stringify(ok.data));
    assertEquals(ok.data.removed, 3);
    const after = await api.get(`/api/res?res=user.index&username=${tag}`);
    assert(after.data.rows.every((r: any) => r.status === "disabled"));
    const bad = await api.post("/api/res/field", { res: "user.index", ids, field: "status", value: "nonsense" });
    assertNotEquals(bad.status, 200);
    assert(!(await api.get(`/api/res?res=user.index&username=${tag}`)).data.rows.some((r: any) => r.status === "nonsense"));
  } finally {
    const l = await api.get(`/api/res?res=user.index&username=${tag}`);
    await api.post("/api/res/remove", { res: "user.index", ids: l.data.rows.map((r: any) => r.id) });
  }
} });

Deno.test({ name: "res: remove — bulk delete, missing ids reported, empty id list is rejected", ...OPTS, fn: async () => {
  const api = await adminApi();
  try {
    const ids = await seed(api, 5);
    const r = await api.post("/api/res/remove", { res: RES, ids: [...ids.slice(0, 3), "000000000000000000000000"] });
    assertEquals(r.data.removed, 3);
    assertEquals(r.data.failed.length, 1);
    assertEquals((await api.get(`/api/res?res=${RES}&title=${TAG}`)).data.total, 2);
    assertEquals((await api.post("/api/res/remove", { res: RES, ids: [] })).status, 400);
  } finally {
    await cleanup(api);
  }
} });

Deno.test({ name: "res: export returns ALL filtered rows (not just a page) as a real xlsx, plus csv/json with display values", ...OPTS, fn: async () => {
  const api = await adminApi();
  try {
    await seed(api, 27);
    const q = `res=${RES}&title=${TAG}&sort=visits&order=asc`;
    // xlsx: zip magic + the right content type + the sheet contains every row
    const x = await fetch(`${Deno.env.get("E2E_BASE") ?? "http://localhost:8810"}/api/res/download?${q}&format=xlsx`, { headers: { cookie: api.cookieHeader() } });
    assertEquals(x.status, 200);
    assert((x.headers.get("content-type") ?? "").includes("spreadsheetml"));
    assertEquals(x.headers.get("content-disposition")?.includes(".xlsx"), true);
    const bytes = new Uint8Array(await x.arrayBuffer());
    assertEquals([bytes[0], bytes[1]], [0x50, 0x4b]); // "PK" — a real OOXML zip, not CSV in disguise
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    const cells: string[] = [];
    ws.eachRow((row) => cells.push(row.values ? String((row.values as unknown[]).join("|")) : ""));
    const dataRows = cells.filter((c) => c.includes(`${TAG}-title-`));
    assertEquals(dataRows.length, 27, "every filtered row is exported, beyond one page");
    // csv / json
    const j = await api.get(`/api/res/download?${q}&format=json`);
    assertEquals(Array.isArray(j.data) ? j.data.length : (j.data.rows ?? j.data).length, 27);
    const csv = await api.get(`/api/res/download?${q}&format=csv`);
    assertEquals(String(csv.data).split("\n").filter((l) => l.includes(`${TAG}-title-`)).length, 27);
    // a filter narrows the export
    const narrow = await api.get(`/api/res/download?res=${RES}&title=${TAG}-title-01&format=csv`);
    assertEquals(String(narrow.data).split("\n").filter((l) => l.includes(`${TAG}-title-`)).length, 1);
    // unsupported format
    assertEquals((await api.get(`/api/res/download?${q}&format=pdf`)).status, 400);
  } finally {
    await cleanup(api);
  }
} });

Deno.test({ name: "res: anonymous callers get 401 and nothing leaks", ...OPTS, fn: async () => {
  await ensureServer();
  const { Api } = await import("../helpers.ts");
  const anon = new Api();
  assertEquals((await anon.get(`/api/res?res=${RES}`)).status, 401);
  assertEquals((await anon.post("/api/res/create", { res: RES, title: "x", category: "y" })).status, 401);
} });

Deno.test({ name: "res: operator without write gets 403 on mutate (无权限)", ...OPTS, fn: async () => {
  const admin = await adminApi();
  const u = await makeUser(admin, ["operator"]);
  try {
    const a = new Api();
    const login = await a.login(u.username, u.password);
    assertEquals(login.status, 200, JSON.stringify(login.data));
    // operator has cms.view routes but not cms.write → POST /api/res/cms.article forbidden
    const create = await a.post("/api/res/create", { res: "cms.article", category: "x", title: "nope" });
    assertEquals(create.status, 403, JSON.stringify(create.data));
    assertEquals(create.data.error, "forbidden");
    assert(String(create.data.message || "").length > 0, "localized 无权限 message expected");
    const update = await a.post("/api/res/update", { res: "cms.article", id: "000000000000000000000000", title: "x" });
    assertEquals(update.status, 403);
    const remove = await a.post("/api/res/remove", { res: "cms.article", ids: ["000000000000000000000000"] });
    assertEquals(remove.status, 403);
  } finally {
    await removeUser(admin, u);
  }
} });
