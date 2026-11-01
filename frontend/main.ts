/**
 * frontend 应用入口
 * 配置由 common/config + frontend/config 自动加载并合并
 */

import { App } from "@dreamer/dweb";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { staticPlugin } from "@dreamer/plugins/static";

const app = new App();

app.registerPlugin(tailwindPlugin({
  output: "dist/frontend/client/assets",
  cssEntry: "frontend/assets/tailwind.css",
  assetsPath: "/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "frontend/assets", prefix: "/assets" },
    { root: "dist/frontend/client/assets", prefix: "/assets" },
  ],
}));

app.start();
