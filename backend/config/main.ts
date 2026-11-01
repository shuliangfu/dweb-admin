/**
 * backend 应用配置
 * 公共字段（version 等）由 common/config 自动合并
 */
import type { AppConfig } from "@dreamer/dweb";
import { getEnvInt } from "@common/utils/env.ts";

export default {
  /** 应用名称，用于日志与元数据。 */
  name: "dweb-admin-backend",
  /** 应用种类：web | api | console */
  kind: "web",
  /** 应用版本号（semver 字符串）。 */
  version: "1.0.0",
  /** 路由：routesDir、apiMode、redirects、skipAppValidation。详见 APP_CONFIG.md。 */
  router: {
    /** 路由文件所在目录（基于文件的路由）。 */
    routesDir: "./backend/routes",
    /**
     * apiMode: "action" — named exports only (`login`, `index`, `create`, …).
     * Match via path last segment / `:method` (and `/api/<resource>` → `index` fallback).
     * No GET|POST|… aliases. See docs/handoff.md § API + backend/api-style.ts.
     */
    apiMode: "action",
  },
  /** HTTP port from APP_PORT_BACKEND (default 3100). */
  server: {
    port: getEnvInt("APP_PORT_BACKEND", 3100),
  },
  /** 渲染：engine（react|preact|view）、mode（ssr|csr|ssg|hybrid）、debug；ssr/ssg 在对应模式下生效。 */
  // 完整说明见 docs/APP_CONFIG.md（含 SSR/SSG 客户端激活；需要时取消下方注释）
  render: {
    /** UI 引擎：view（推荐）、preact 或 react。 */
    engine: "view",
    /** 渲染模式：ssr（服务端渲染 + 当前页 hydrate，菜单点击整页跳转，适合带鉴权的后台）。 */
    mode: "ssr",
    // debug: false,
    // /** 仅 SSR：是否启用客户端激活（hydrate），默认 true。设为 false 时仅输出服务端 HTML：不注入 _client.js、不执行 hydrate；链接为整页跳转；可避免刷新时闪动。 */
    // ssr: {
    //   /** 是否启用客户端激活。false = 仅服务端 HTML、不注入 _client.js、整页跳转、无刷新闪动。 */
    //   hydrate: true,
    // },
    // ssg: {
    //   outputDir: "dist/static",
    //   routes: ["/", "/about"],
    //   /** 支持路径段（/user/[id]→/user/1）与 query（/user?id=[id]→/user?id=1）两种形式 */
    //   dynamicRoutes: {
    //     "/user/[id]": ["1", "2", "3"],
    //   }, // 或 "/user?id=[id]": ["1", "2", "3"]
    //   /** 是否为静态 HTML 启用客户端激活。false = 不注入 _client.js、整页跳转。 */
    //   hydrate: true,
    // },
  },
  /** 日志：level、format、output（console、file）、color、showTime、showLevel、tags、filter、maxMessageLength。 */
  logger: {
    /** 日志级别：debug、info、warn、error。 */
    level: "info",
    /** 输出格式：text 或 json。 */
    format: "text",
    /** 输出目标：console（auto|true|false）、file（path、rotate、strategy、maxSize、maxFiles）。 */
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/backend.log",
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
} satisfies AppConfig;
