/**
 * console 应用配置
 * 公共字段（version 等）由 common/config 自动合并
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  /** 应用名称，用于日志与元数据。 */
  name: "dweb-admin-console",
  /** 应用种类：web | api | console */
  kind: "console",
  /** 应用版本号（semver 字符串）。 */
  version: "1.0.0",
  /** 路由：routesDir、apiMode、redirects、skipAppValidation。详见 APP_CONFIG.md。 */
  router: {
    /** 路由文件所在目录（基于文件的路由）。 */
    routesDir: "./console/routes",
  },
  /** 日志：level、format、output（console、file）、color、showTime、showLevel、tags、filter、maxMessageLength。 */
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/console.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
} satisfies AppConfig;
