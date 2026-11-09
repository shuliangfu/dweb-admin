/**
 * About — substantive product portal
 * 路由: /about
 * marker: FE_ABOUT_RICH_COPY_20261107
 */

import { Button, Card } from "@dreamer/ui-view";
import { openCsSupport } from "@frontend/components/cs-support-open.ts";

export default function About() {
  return (
    <div class="space-y-8">
      <section class="rounded-[20px] border border-[#e2e8f0] bg-gradient-to-br from-white to-slate-50 px-6 py-10 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:px-10">
        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">
          About
        </p>
        <h1 class="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          关于 Dweb Admin
        </h1>
        <p class="max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          dweb-admin 是基于 Deno + @dreamer/dweb 的后台管理模板与配套访客端：用
          @dreamer/view（JSX）与 @dreamer/ui-view 重写原 Vue 管理端壳层与业务页，目标是可运行的
          Yii2 风格 RBAC 后台，并打通 Web／手机访客介绍与实时客服。
        </p>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <Card bordered class="rounded-2xl border-[#e2e8f0] bg-white dark:bg-slate-900" title="产品定位">
          <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            管理端集中处理管理员账号、角色权限、菜单、内容运营与客服接待；本站（Frontend）向业务方与访客说明产品能力，并提供客服入口。手机端以 App 壳呈现同一产品信息与整页会话，两端分道、互不污染交互形态。
          </p>
        </Card>
        <Card bordered class="rounded-2xl border-[#e2e8f0] bg-white dark:bg-slate-900" title="技术栈">
          <ul class="ml-5 list-disc space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li><strong>@dreamer/dweb</strong> — 全栈 Web 框架（SSR／Hybrid）</li>
            <li><strong>@dreamer/view</strong> — 轻量 UI 运行时</li>
            <li><strong>@dreamer/ui-view</strong> — 统一组件库</li>
            <li><strong>@dreamer/websocket</strong> — 实时客服通道</li>
            <li><strong>Deno</strong> + <strong>TypeScript</strong> + Mongo</li>
          </ul>
        </Card>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <Card bordered class="rounded-2xl border-[#e2e8f0] bg-white dark:bg-slate-900" title="管理端能力">
          <ul class="ml-5 list-disc space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>RBAC：管理员／角色／权限／路由／分配</li>
            <li>账号安全：验证码登录、锁屏、Passkey、在线会话</li>
            <li>业务模板：会员分册、CMS 叶子、系统与菜单管理</li>
            <li>DataPanel：搜索、列显隐、导入导出、打印</li>
          </ul>
        </Card>
        <Card bordered class="rounded-2xl border-[#e2e8f0] bg-white dark:bg-slate-900" title="访客端能力">
          <ul class="ml-5 list-disc space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>产品介绍：讲清 dweb-admin 是什么、能做什么</li>
            <li>在线客服浮窗：无需登录发起访客会话（切页保活）</li>
            <li>多端：Web 门户气质；手机端原生 App 壳（底 Tab／整页聊）</li>
            <li>实时同步：消息进入管理端接待窗</li>
          </ul>
        </Card>
      </div>

      <section class="rounded-[20px] border border-indigo-100 bg-indigo-50/60 px-6 py-8 text-center dark:border-indigo-900/40 dark:bg-indigo-950/30 sm:px-10">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          需要帮助？
        </h2>
        <p class="mb-5 text-sm text-slate-600 dark:text-slate-400">
          无需登录即可发起访客会话，消息实时同步到管理端。
        </p>
        <Button type="button" variant="primary" onClick={() => openCsSupport()}>
          在线客服
        </Button>
      </section>
    </div>
  );
}
