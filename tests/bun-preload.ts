/**
 * Bun test preload: map @common/@backend/... aliases (deno.json style) for Bun.
 */
import { plugin } from "bun";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const aliases: Record<string, string> = {
  "@common/": join(root, "common") + "/",
  "@backend/": join(root, "backend") + "/",
  "@frontend/": join(root, "frontend") + "/",
  "@mobile/": join(root, "mobile") + "/",
  "@api/": join(root, "api") + "/",
  "@console/": join(root, "console") + "/",
};

plugin({
  name: "dweb-admin-aliases",
  setup(build) {
    const filter = /^@(?:common|backend|frontend|mobile|api|console)\//;
    build.onResolve({ filter }, (args) => {
      for (const [prefix, dir] of Object.entries(aliases)) {
        if (args.path.startsWith(prefix)) {
          return { path: dir + args.path.slice(prefix.length) };
        }
      }
    });
  },
});
