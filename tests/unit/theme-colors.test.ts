/** Light vs dark admin chrome colours: distinct, hierarchy kept, WCAG AA text contrast. */
import { assert, assertEquals } from "@std/assert";

const raw = await Deno.readTextFile(new URL("../../backend/assets/tailwind.css", import.meta.url));
const css = (await Deno.readTextFile(new URL("../../backend/assets/tailwind.css", import.meta.url))).replace(/\/\*[\s\S]*?\*\//g, "");

function block(selector: RegExp): string {
  const m = css.match(new RegExp(selector.source + "\\s*\\{([\\s\\S]*?)\\n\\}", "m"));
  assert(m, `block ${selector} not found`);
  return m![1];
}
const tokens = new Map<string, string>();
for (const m of css.matchAll(/--color-adminlte-[a-z-]+:\s*([^;]+);/g)) {
  const name = m[0].split(":")[0];
  tokens.set(name, m[1].replace(/\/\*.*?\*\//g, "").trim());
}
function varsOf(b: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of b.matchAll(/(--adm-[a-z-]+):\s*([^;]+);/g)) out.set(m[1], m[2].replace(/\/\*.*?\*\//g, "").trim());
  return out;
}
function resolve(v: string | undefined): string {
  assert(v);
  const r = v!.match(/^var\((--[a-z-]+)\)$/);
  if (r) return resolve(tokens.get(r[1]));
  return v!;
}
const hex = (c: string) => {
  const m = c.match(/^#([0-9a-f]{6})/i);
  assert(m, `not a hex colour: ${c}`);
  return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16));
};
const lum = (c: string) => {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Light = first `:root` block that defines --adm-side; dark = `.dark` block.
const lightVars = varsOf(css.split(":root {").find((b) => b.includes("--adm-side"))!.split("\n}")[0]);
const darkVars = varsOf(block(/\.dark/));
const L = (k: string) => resolve(lightVars.get(k));
const D = (k: string) => resolve(darkVars.get(k));

Deno.test("dark mode chrome colours are unchanged", () => {
  assertEquals(D("--adm-side").toLowerCase(), "#020617");
  assertEquals(D("--adm-top-bg").toLowerCase(), "#0f172a");
  assertEquals(D("--adm-brand-strip").toLowerCase(), "#0f172a");
});

Deno.test("light sidebar is slate-800 (lighter than the dark-mode sidebar)", () => {
  assertEquals(L("--adm-side").toLowerCase(), "#1e293b");
  assert(lum(L("--adm-side")) > lum(D("--adm-side")));
});

Deno.test("light navbar equals the logo strip and both are 1 shade darker than the sidebar", () => {
  assertEquals(L("--adm-brand-strip").toLowerCase(), "#0f172a"); // slate-900 = one step below slate-800
  assertEquals(L("--adm-top-bg").toLowerCase(), L("--adm-brand-strip").toLowerCase(), "navbar must match the logo area exactly");
  assert(lum(L("--adm-top-bg")) < lum(L("--adm-side")));
});

Deno.test("light chrome text/icon contrast meets WCAG AA (4.5:1)", () => {
  assert(contrast(L("--adm-side"), L("--adm-text")) >= 4.5, "sidebar text");
  assert(contrast(L("--adm-side"), L("--adm-text-hover")) >= 4.5, "sidebar hover text");
  assert(contrast(L("--adm-sub-hover"), L("--adm-text-hover")) >= 4.5, "sidebar hover bg");
  assert(contrast(L("--adm-top-bg"), L("--adm-top-fg")) >= 4.5, "navbar text");
  assert(contrast(L("--adm-brand-strip"), L("--adm-brand-fg")) >= 4.5, "logo text");
});

// ---- tab close (x) button: theme warning (orange), darker on hover, in both modes
const warn = new Map<string, string>();
for (const m of css.matchAll(/--color-warning-(\d+):\s*(#[0-9a-fA-F]{6});/g)) warn.set(m[1], m[2]);
const tagBg = (vars: Map<string, string>, isDark: boolean) => (isDark ? "#0f172a" : resolve(vars.get("--adm-tag-bg")));

Deno.test("tab close button uses the warning colour in light and dark, darker on hover", () => {
  for (const [vars, isDark] of [[lightVars, false], [darkVars, true]] as const) {
    const base = resolve(warn.get(String(vars.get("--adm-tag-close")?.match(/warning-(\d+)/)?.[1])) ?? vars.get("--adm-tag-close"));
    const hover = resolve(warn.get(String(vars.get("--adm-tag-close-hover")?.match(/warning-(\d+)/)?.[1])) ?? vars.get("--adm-tag-close-hover"));
    assert(vars.get("--adm-tag-close")?.includes("--color-warning-"), "base is a warning token");
    assert(vars.get("--adm-tag-close-hover")?.includes("--color-warning-"), "hover is a warning token");
    assert(lum(hover) < lum(base), `${isDark ? "dark" : "light"}: hover must be darker`);
    // non-text UI contrast (WCAG 1.4.11) >= 3:1 against the tab bar
    assert(contrast(tagBg(vars, isDark), base) >= 3, `${isDark ? "dark" : "light"}: x contrast on tab bar`);
  }
});

Deno.test("tab close CSS binds to the tokens and no longer fades with opacity", () => {
  const rule = raw.match(/\.adm-tag-close\s*\{[^}]*\}/)![0];
  assert(rule.includes("var(--adm-tag-close)"));
  assert(!/opacity/.test(rule));
  assert(/\.adm-tag-close > \*[\s\S]*?color:\s*inherit\s*!important/.test(raw), "icon must inherit the button colour");
  assert(/\.adm-tag-close:hover\s*\{[^}]*var\(--adm-tag-close-hover\)/.test(raw));
});
