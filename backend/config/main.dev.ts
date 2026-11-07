/**
 * 开发环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
 * marker: UPLOAD_HMR_IGNORE_20261107
 */
export default {
  server: {
    host: "127.0.0.1",
    dev: {
      hmr: {
        enabled: true,
        path: "/__hmr",
      },
      watch: {
        paths: ["./backend", "./common"],
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
