/**
 * Route scanner: discovers the pages and API endpoints that exist under
 * backend/routes/ (dweb file routing) as { method, path } pairs, so the
 * "Routes" admin page can offer them for management.
 *
 *  - page files (*.tsx): GET <path>          (index.tsx → directory path)
 *  - api files  (*.ts) : one entry per exported GET/POST/PUT/PATCH/DELETE
 *  - [param] segments become :param
 *  - special files (_app, _layout, ...) and public / login-only paths are skipped
 */
import type { RouteMethod } from "@common/model/mod.ts";
import { isAuthOnlyPath, isPublicPath } from "@common/service/rbac.ts";

export interface ScannedRoute {
  method: RouteMethod;
  path: string;
}

const METHOD_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

async function* walk(dir: string, rel = ""): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir)) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory) yield* walk(`${dir}/${e.name}`, r);
    else yield r;
  }
}

export async function scanRoutes(root = "./backend/routes"): Promise<ScannedRoute[]> {
  const found = new Map<string, ScannedRoute>();
  try {
    for await (const file of walk(root)) {
      const name = file.split("/").pop()!;
      if (name.startsWith("_") || name.startsWith(".")) continue;
      const isPage = file.endsWith(".tsx");
      if (!isPage && !file.endsWith(".ts")) continue;
      let path = "/" + file.replace(/\.(tsx|ts)$/, "").replace(/\[([^\]]+)\]/g, ":$1");
      path = path.replace(/\/index$/, "") || "/";
      if (isPublicPath(path) || isAuthOnlyPath(path)) continue;
      const methods: RouteMethod[] = [];
      if (isPage) methods.push("GET");
      else {
        const src = await Deno.readTextFile(`${root}/${file}`);
        for (const m of src.matchAll(METHOD_RE)) methods.push(m[1] as RouteMethod);
      }
      for (const method of methods) found.set(`${method} ${path}`, { method, path });
    }
  } catch {
    // routes dir not present (e.g. compiled build): nothing to scan
  }
  // Virtual write routes of the generic resource API: POST /api/res/<key> (create/update/remove/field).
  try {
    const { allResources } = await import("@common/resources/mod.ts");
    for (const d of allResources()) {
      if (d.create || d.update || d.remove || d.setField) {
        found.set(`POST /api/res/${d.key}`, { method: "POST", path: `/api/res/${d.key}` });
      }
    }
  } catch { /* resources unavailable */ }
  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
