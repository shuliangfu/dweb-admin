/**
 * 开发环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
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
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  hotReload: true,
};
