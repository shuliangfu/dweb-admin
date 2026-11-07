/// <reference lib="dom" />
/** Compare the list-page toolbar button group of an old checkout (OLD base) against the current tree (NEW base). */
import { chromium } from "playwright";
const OLD = Deno.env.get("OLD") ?? "http://localhost:8811", NEW = Deno.env.get("NEW") ?? "http://localhost:8810";
const PATH = Deno.env.get("P") ?? "/rbac/admins";
async function shot(base: string, dark: boolean): Promise<Uint8Array> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await ctx.request.get(base + "/login");
  const csrf = (await ctx.cookies()).find((c) => c.name === "_csrf")?.value ?? "";
  const r = await ctx.request.post(base + "/api/auth/login", { data: { username: "admin", password: "admin888" }, headers: { "x-csrf-token": csrf } });
  if (r.status() !== 200) throw new Error("login " + base + " " + r.status());
  if (dark) await ctx.addCookies([{ name: "dweb-admin-theme", value: "dark", url: base }]);
  const page = await ctx.newPage();
  await page.goto(base + PATH);
  await page.waitForSelector(".dp-tool-group");
  await page.waitForTimeout(1500);
  const el = page.locator(".dp-tool-group").first();
  const b = await el.boundingBox();
  const png = await page.screenshot({ clip: { x: b!.x - 8, y: b!.y - 8, width: 340, height: b!.height + 16 } });
  await browser.close();
  return png;
}
const b64 = (u: Uint8Array) => "data:image/png;base64," + btoa(Array.from(u, (c) => String.fromCharCode(c)).join(""));
for (const dark of [false, true]) {
  const name = dark ? "dark" : "light";
  const [o, n] = [await shot(OLD, dark), await shot(NEW, dark)];
  await Deno.mkdir("runtime/theme", { recursive: true });
  await Deno.writeFile(`runtime/theme/toolbar-old-${name}.png`, o);
  await Deno.writeFile(`runtime/theme/toolbar-new-${name}.png`, n);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 760, height: 300 } });
  await page.setContent(`<body style="margin:0;background:#888;font:14px sans-serif;color:#fff"><div style="padding:6px">OLD (2c041c4)</div><img src="${b64(o)}"><div style="padding:6px">NEW (current)</div><img src="${b64(n)}"></body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `runtime/theme/toolbar-compare-${name}.png`, fullPage: true });
  const diff = await page.evaluate(async ([a, c]: string[]) => {
    const load = (s: string) => new Promise<HTMLImageElement>((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(a), load(c)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return `size differs ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`;
    const d = (i: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = i.width; cv.height = i.height; const x = cv.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const da = d(ia), db = d(ib); let n = 0, first = "";
    for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 24) { n++; if (!first) first = `${(k / 4) % ia.width},${Math.floor(k / 4 / ia.width)}`; }
    return `${n} px differ (first at ${first})`;
  }, [b64(o), b64(n)]);
  console.log(name, diff);
  await browser.close();
}
