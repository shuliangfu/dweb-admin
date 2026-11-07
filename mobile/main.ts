/**
 * mobile 应用入口
 * 配置由 common/config + mobile/config 自动加载并合并
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
