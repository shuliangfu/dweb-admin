/**
 * 开发环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
 * marker: UPLOAD_HMR_IGNORE_20261107 — 勿 watch ./src（不存在会回落 ./）以免上传写 uploads/ 触发整页 HMR
 */
import { getEnvInt } from "@common/utils/env.ts";

export default {
  server: {
    host: "127.0.0.1",
    port: getEnvInt("APP_PORT_API", 8813),
    dev: {
      hmr: {
        enabled: true,
        path: "/__hmr",
      },
      watch: {
        paths: ["./api", "./common"],
        ignore: ["node_modules", ".git", "dist", "runtime", "uploads"],
      },
    },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  hotReload: true,
};
