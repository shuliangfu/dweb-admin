/**
 * mobile 应用入口
 * 配置由 common/config + mobile/config 自动加载并合并
 */

import { App } from "@dreamer/dweb";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { staticPlugin } from "@dreamer/plugins/static";

const app = new App();

app.registerPlugin(tailwindPlugin({
  output: "dist/mobile/client/assets",
  cssEntry: "mobile/assets/tailwind.css",
  assetsPath: "/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "mobile/assets", prefix: "/assets" },
    { root: "dist/mobile/client/assets", prefix: "/assets" },
  ],
}));

app.start();
