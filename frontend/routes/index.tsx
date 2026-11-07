/**
 * Home — product landing (not a demo counter)
 * 路由: /
 */

import { Button, Card } from "@dreamer/ui-view";

const features = [
  {
    title: "统一管理台",
    body: "账号、权限与业务配置集中管理，开箱可用。",
  },
  {
    title: "实时客服",
    body: "访客一键连线，会话实时同步到管理端。",
  },
  {
    title: "SSR / Hybrid",
    body: "首屏服务端渲染，客户端路由流畅切换。",
  },
  {
    title: "TypeScript 全栈",
    body: "Deno + View，类型贯通前后端。",
  },
];

export default function Home() {
  return (
    <div class="space-y-10">
      <section class="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-14 text-center shadow-sm dark:border-indigo-900/40 sm:px-10 sm:py-16">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
        <div class="relative mx-auto max-w-2xl">
          <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Dweb Admin
          </p>
          <h1 class="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            干净、可靠的管理前台
          </h1>
          <p class="mb-8 text-base leading-relaxed text-slate-300 sm:text-lg">
            面向业务团队的门户入口：查看能力、了解产品，需要帮助时直接联系客服。
          </p>
          <a href="/support" data-testid="contact-cs" class="inline-block">
            <Button type="button" variant="primary" class="h-11 px-6 text-base">
              联系客服
            </Button>
          </a>
        </div>
      </section>

      <section>
        <h2 class="mb-6 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
          核心能力
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card
              bordered
              class="h-full bg-white dark:bg-slate-900"
              title={f.title}
            >
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {f.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-900 sm:px-10">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          遇到问题？
        </h2>
        <p class="mb-5 text-sm text-slate-500 dark:text-slate-400">
          客服在线接待访客会话，无需登录即可发起对话。
        </p>
        <a href="/support" class="inline-block">
          <Button type="button" variant="secondary">
            前往客服页
          </Button>
        </a>
      </section>
    </div>
  );
}
