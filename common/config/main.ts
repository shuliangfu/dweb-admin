/**
 * 公共配置
 * 前后端共享的配置，框架会自动与各应用配置深度合并
 * 完整配置项说明见文档: docs/en-US/APP_CONFIG.md
 * name、version 在各应用 src/<app>/config/main.ts 中配置；此处仅共享 language、server、router、render、build、logger 等。
 */

import { getEnv, getEnvInt } from "@common/utils/env.ts";

const dbName = getEnv("DB_NAME") ?? "dweb_admin";
const dbUser = getEnv("DB_USER") ?? "";
const dbPass = getEnv("DB_PASS") ?? "";

/** 默认导出，框架会自动深度合并到各应用配置 - 共享片段，各应用 default 导出时 spread 并覆盖；各应用 config 中需写 name、version */
export default {
  /** 框架语言（根据用户环境自动检测） （init 时按环境检测，可改为 zh-CN / en-US） */
  language: "zh-CN",
  /** 从环境变量注入配置时的前缀（如 APP_PORT）。取消注释以启用。 */
  // envPrefix: "APP_",
  /** 开发态启用配置热重载；配置变更时框架会重启。 */
  hotReload: true,
  /** 插件管理器：autoActivate、continueOnError、enableHotReload、hotReloadInterval。取消注释可自定义。 */
  // pluginManagerOptions: {
  //   autoActivate: false,
  //   continueOnError: true,
  //   enableHotReload: false,
  //   hotReloadInterval: 1000,
  // },

  /** HTTP 服务：host、port、dev（HMR、watch）、mode、onListen、onError、debug、shutdownTimeout。 */
  server: {
    host: getEnv("APP_HOST") ?? "127.0.0.1",
    /** port 由各应用 config 覆盖 */
    // dev: {
    //   hmr: { enabled: true, path: "/__hmr" },
    //   watch: { paths: ["./src"], ignore: ["node_modules", ".git", "dist"] },
    // },
    // mode: "dev", onListen, onError, debug, shutdownTimeout
  },

  /** 路由：routesDir、apiMode、redirects、skipAppValidation。详见 APP_CONFIG.md。 */
  router: {
    /** routesDir 由各应用覆盖 */
    // apiMode: "restful",
    // redirects: [],
    // skipAppValidation: false,
  },

  /** 渲染：engine（react|preact|view）、mode（ssr|csr|ssg|hybrid）、debug；ssr/ssg 在对应模式下生效。 */
  render: {
    /** UI 引擎：view（推荐）、preact 或 react。 */
    engine: "view",
    /** 渲染模式：hybrid（SSR+客户端路由）、ssr、csr 或 ssg。 */
    mode: "hybrid",
    // debug: false,
    // ssr: { hydrate: true },
    // ssg: { outputDir: "dist/static", routes: ["/", "/about"], dynamicRoutes: { "/user/[id]": ["1", "2", "3"] }, hydrate: true },
  },

  /** 构建：server（entry、output、compile、external）、client、assets、build 等。详见 APP_CONFIG.md。 */
  build: {
    server: { useNativeCompile: false },
    // client: {}, assets: {}, build: {}
  },

  /** 日志：level、format、output（console、file）、color、showTime、showLevel、tags、filter、maxMessageLength。 */
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/app.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
    // color, showTime, showLevel, tags, filter, maxMessageLength
  },

  // Production: securityHeaders/cors/rateLimit still opt-in; compression defaults on outside dev
  // Prefer cors allowlist (cors: true ⇒ origin "*"). See PRODUCTION_CHECKLIST.
  // securityHeaders: true,
  // cors: { origin: ["https://app.example.com"], credentials: true },
  // compression: false, // or { threshold: 1024, enableBrotli: true }
  // rateLimit: true,

  /**
   * MongoDB（@dreamer/database，dweb 内置，配置后 MongoModel 懒加载连接）。
   * 账号/密码只从环境变量读取（.env，已被 .gitignore 忽略）；本地开发库为空账号即可。
   * 注意：环境变量不要用 SESSION_ 前缀，否则 dweb 会误注册 session 中间件。
   */
  database: {
    default: {
      adapter: "mongodb" as const,
      connection: {
        host: getEnv("DB_HOST") ?? "127.0.0.1",
        port: getEnvInt("DB_PORT", 27017),
        database: dbName,
        ...(dbUser
          ? {
            username: dbUser,
            password: dbPass,
            authSource: getEnv("DB_AUTH_SOURCE") ?? "admin",
          }
          : {}),
      },
      mongoOptions: {
        directConnection: true,
        maxPoolSize: 20,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 5000,
      },
    },
  },
  /** 实时通信：adapter（socketio|websocket）、config（path、pingTimeout、pingInterval、transports 等）。取消注释以使用。 */
  // socket: { adapter: "socketio" | "websocket", config: {} },
  /** 会话：store（如 createFileStore）、name、maxAge、cookie、autoSave。需 @dreamer/session。取消注释以使用。 */
  // session: { store, name, maxAge, cookie, autoSave, genId },
  /** 插件：路径字符串或 { name, version, dependencies, config, onInit, onRequest, ... } 数组。取消注释以添加。 */
  // plugins: [],
  /** 中间件：{ middleware, name?, condition? } 或路径字符串数组。取消注释以添加。 */
  // middlewares: [],
};
