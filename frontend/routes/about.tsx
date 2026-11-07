/**
 * About — product portal
 * 路由: /about
 */

import { Button, Card } from "@dreamer/ui-view";

export default function About() {
  return (
    <div class="space-y-8">
      <section class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-10 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:px-10">
        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">
          About
        </p>
        <h1 class="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          关于 Dweb Admin
        </h1>
        <p class="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          面向业务团队的管理控制台与配套前台：账号权限、内容运营与实时客服一体，基于 @dreamer/dweb 构建。
        </p>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <Card bordered class="bg-white dark:bg-slate-900" title="产品定位">
          <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            本站为访客与业务方提供产品介绍与客服入口；管理端负责账号、权限与会话接待。
          </p>
        </Card>
        <Card bordered class="bg-white dark:bg-slate-900" title="技术栈">
          <ul class="ml-5 list-disc space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li><strong>@dreamer/dweb</strong> — 全栈 Web 框架</li>
            <li><strong>@dreamer/view</strong> — 轻量 UI 运行时</li>
            <li><strong>@dreamer/ui-view</strong> — 统一组件库</li>
            <li><strong>Deno</strong> + <strong>TypeScript</strong></li>
          </ul>
        </Card>
      </div>

      <section class="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-6 py-8 text-center dark:border-indigo-900/40 dark:bg-indigo-950/30 sm:px-10">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          需要帮助？
        </h2>
        <p class="mb-5 text-sm text-slate-600 dark:text-slate-400">
          无需登录即可发起访客会话，消息实时同步到管理端。
        </p>
        <a href="/support" class="inline-block">
          <Button type="button" variant="primary">联系客服</Button>
        </a>
      </section>
    </div>
  );
}
