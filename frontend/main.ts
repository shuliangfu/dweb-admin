/**
 * frontend 应用入口
 * 配置由 common/config + frontend/config 自动加载并合并
 * Guest CS：同源代理 /cs,/ui-view-upload,/ws → api（见 csApiProxyMiddleware）
 */

import { App, type AppMiddleware } from "@dreamer/dweb";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { staticPlugin } from "@dreamer/plugins/static";
import { csApiProxyMiddleware } from "@common/middleware/cs-api-proxy.ts";

const app = new App();

const use = (mw: unknown) => app.use(mw as AppMiddleware);
use(csApiProxyMiddleware);

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
