/**
 * api 应用配置
 * 公共字段（version 等）由 common/config 自动合并
 * Production: securityHeaders / cors allowlist / rateLimit — see PRODUCTION_CHECKLIST
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  /** 应用名称，用于日志与元数据。 */
  name: "dweb-admin-api",
  /** 应用种类：web | api | console */
  kind: "api",
  /** 应用版本号（semver 字符串）。 */
  version: "1.0.0",
  /** 路由：routesDir、apiMode、redirects、skipAppValidation。详见 APP_CONFIG.md。 */
  router: {
    /** 路由文件所在目录（基于文件的路由）。kind:"api" → handlers live directly under routes/. */
    routesDir: "./api/routes",
    /** Same dual-template rule as backend; samples in api/routes/hello.ts export both. See handoff. */
    apiMode: "restful",
  },
  /** 日志：level、format、output（console、file）、color、showTime、showLevel、tags、filter、maxMessageLength。 */
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/api.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
  /** 构建：server（entry、output、compile、external）、client、assets、build 等。详见 APP_CONFIG.md。 */
  build: {
    server: {
      /** 服务端是否使用原生编译（Bun/Deno）。false = 仅转译。 */
      useNativeCompile: false,
    },
  },
  // securityHeaders: true,
  // cors: { origin: ["https://app.example.com"], credentials: true },
  // rateLimit: { windowMs: 60_000, max: 120 },
} satisfies AppConfig;
