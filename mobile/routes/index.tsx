/**
 * Mobile home — single-column, touch-friendly
 * 路由: /
 */

import { Button, Card } from "@dreamer/ui-view";

const features = [
  {
    title: "统一管理台",
    body: "账号与权限集中管理，手机也能跟进。",
  },
  {
    title: "实时客服",
    body: "一键连线，会话同步到管理端。",
  },
  {
    title: "轻量流畅",
    body: "Hybrid 渲染，弱网下也尽量好用。",
  },
];

export default function Home() {
  return (
    <div class="space-y-6">
      <section class="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-10 text-center dark:border-indigo-900/40">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
        <div class="relative">
          <p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
            Dweb Admin
          </p>
          <h1 class="mb-3 text-2xl font-bold tracking-tight text-white">
            手机端门户
          </h1>
          <p class="mb-6 text-sm leading-relaxed text-slate-300">
            查能力、找帮助；客服随时可聊。
          </p>
          <a href="/support" data-testid="contact-cs" class="inline-block w-full max-w-xs">
            <Button
              type="button"
              variant="primary"
              class="h-12 w-full text-base"
            >
              联系客服
            </Button>
          </a>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-center text-base font-semibold text-slate-800 dark:text-slate-100">
          核心能力
        </h2>
        {features.map((f) => (
          <Card
            bordered
            class="bg-white dark:bg-slate-900"
            title={f.title}
          >
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {f.body}
            </p>
          </Card>
        ))}
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 class="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">
          需要帮助？
        </h2>
        <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
          无需登录即可发起访客会话。
        </p>
        <a href="/support" class="inline-block w-full max-w-xs">
          <Button type="button" variant="secondary" class="h-11 w-full">
            前往客服页
          </Button>
        </a>
      </section>
    </div>
  );
}
