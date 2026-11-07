/**
 * Mobile about
 * 路由: /about
 */

import { Button, Card } from "@dreamer/ui-view";

export default function About() {
  return (
    <div class="space-y-5">
      <section class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
          About
        </p>
        <h1 class="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          关于 Dweb Admin
        </h1>
        <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          管理控制台配套手机门户：查能力、找帮助，客服随时可聊。
        </p>
      </section>

      <Card bordered class="bg-white dark:bg-slate-900" title="产品定位">
        <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          访客前台 + 管理端客服接待；账号权限与实时会话一体。
        </p>
      </Card>

      <Card bordered class="bg-white dark:bg-slate-900" title="技术栈">
        <ul class="ml-5 list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>@dreamer/dweb / view / ui-view</li>
          <li>Deno + TypeScript</li>
        </ul>
      </Card>

      <section class="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-6 text-center dark:border-indigo-900/40 dark:bg-indigo-950/30">
        <h2 class="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">
          需要帮助？
        </h2>
        <p class="mb-4 text-xs text-slate-600 dark:text-slate-400">
          无需登录即可联系客服。
        </p>
        <a href="/support" class="inline-block w-full max-w-xs">
          <Button type="button" variant="primary" class="h-11 w-full">
            联系客服
          </Button>
        </a>
      </section>
    </div>
  );
}
