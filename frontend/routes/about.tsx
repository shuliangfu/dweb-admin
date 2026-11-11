/**
 * About — substantive product portal
 * 路由: /about
 * marker: FE_ABOUT_RICH_COPY_20261107
 */

import { openCsSupport } from "@frontend/components/cs-support-open.ts";

const techChips = [
  "@dreamer/dweb",
  "@dreamer/view",
  "@dreamer/ui-view",
  "@dreamer/websocket",
  "Deno",
  "TypeScript",
  "Mongo",
];

export default function About() {
  return (
    <div>
      <section class="px-6 pb-0 pt-16 sm:px-10 lg:px-16">
        <div class="mx-auto max-w-[1440px]">
          <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a3d]">
            About
          </p>
          <h1 class="mb-4 text-4xl font-bold tracking-tight text-[#12101a] dark:text-slate-50 sm:text-5xl lg:text-[56px]">
            关于 Dweb Admin
          </h1>
          <p class="max-w-[720px] text-base leading-[1.75] text-[#5c5665] dark:text-slate-300 sm:text-lg">
            dweb-admin 是基于 Deno + @dreamer/dweb
            的后台管理模板与配套访客端：用 @dreamer/view（JSX）与 @dreamer/ui-view
            重写原 Vue 管理端壳层与业务页，目标是可运行的 Yii2 风格 RBAC
            后台，并打通 Web／手机访客介绍与实时客服。
          </p>
        </div>
      </section>

      <section class="px-6 pb-0 pt-9 sm:px-10 lg:px-16">
        <div class="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-2">
          <article class="min-h-[220px] rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] p-7 shadow-[0_10px_30px_rgba(18,16,26,0.03)] dark:border-slate-700 dark:bg-slate-900">
            <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a3d]">
              定位
            </p>
            <h3 class="mb-2.5 text-[22px] font-semibold text-[#12101a] dark:text-slate-50">
              产品定位
            </h3>
            <p class="m-0 text-sm leading-[1.75] text-[#5c5665] dark:text-slate-300">
              管理端集中处理管理员账号、角色权限、菜单、内容运营与客服接待；本站向业务方与访客说明产品能力，并提供客服入口。手机端以
              App 壳呈现同一产品信息与整页会话，两端分道、互不污染交互形态。
            </p>
          </article>

          <article class="min-h-[220px] rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] p-7 shadow-[0_10px_30px_rgba(18,16,26,0.03)] dark:border-slate-700 dark:bg-slate-900">
            <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a3d]">
              栈
            </p>
            <h3 class="mb-2.5 text-[22px] font-semibold text-[#12101a] dark:text-slate-50">
              技术栈
            </h3>
            <div class="mt-3.5 flex flex-wrap gap-2">
              {techChips.map((chip) => (
                <span class="rounded-full border border-[#e8e2d8] bg-[#f4f0ea] px-3 py-1.5 text-xs font-semibold text-[#3f3a45]">
                  {chip}
                </span>
              ))}
            </div>
            <p class="mt-3.5 text-sm leading-[1.75] text-[#5c5665] dark:text-slate-300">
              全栈 SSR／Hybrid 框架，配合轻量 UI
              运行时与统一组件库，实时客服走 WebSocket 通道。
            </p>
          </article>

          <article class="min-h-[220px] rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] p-7 shadow-[0_10px_30px_rgba(18,16,26,0.03)] dark:border-slate-700 dark:bg-slate-900">
            <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a3d]">
              后台
            </p>
            <h3 class="mb-2.5 text-[22px] font-semibold text-[#12101a] dark:text-slate-50">
              管理端能力
            </h3>
            <ul class="m-0 ml-[18px] list-disc space-y-1 p-0 text-sm leading-[1.75] text-[#5c5665] dark:text-slate-300">
              <li>RBAC：管理员／角色／权限／路由／分配</li>
              <li>账号安全：验证码登录、锁屏、Passkey、在线会话</li>
              <li>业务模板：会员分册、CMS 叶子、系统与菜单管理</li>
              <li>DataPanel：搜索、列显隐、导入导出、打印</li>
            </ul>
          </article>

          <article class="min-h-[220px] rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] p-7 shadow-[0_10px_30px_rgba(18,16,26,0.03)] dark:border-slate-700 dark:bg-slate-900">
            <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a3d]">
              访客
            </p>
            <h3 class="mb-2.5 text-[22px] font-semibold text-[#12101a] dark:text-slate-50">
              访客端能力
            </h3>
            <ul class="m-0 ml-[18px] list-disc space-y-1 p-0 text-sm leading-[1.75] text-[#5c5665] dark:text-slate-300">
              <li>产品介绍：讲清 dweb-admin 是什么、能做什么</li>
              <li>在线客服浮窗：无需登录发起访客会话（切页保活）</li>
              <li>多端：Web 门户气质；手机端原生 App 壳</li>
              <li>实时同步：消息进入管理端接待窗</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="px-6 pb-16 pt-12 sm:px-10 lg:px-16">
        <div class="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 rounded-[32px] border border-[#e8e2d8] bg-[#fffcf8] px-8 py-12 shadow-[0_10px_30px_rgba(18,16,26,0.03)] sm:flex-row sm:items-center sm:px-14">
          <div>
            <h2 class="m-0 text-2xl font-bold tracking-tight text-[#12101a] dark:text-slate-50 sm:text-[28px]">
              需要帮助？
            </h2>
            <p class="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-[#6b6570] dark:text-slate-300">
              无需登录即可发起访客会话，消息实时同步到管理端。
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-12 shrink-0 items-center justify-center rounded-[14px] bg-[#12101a] px-[22px] text-[15px] font-semibold text-[#fffcf8] transition hover:bg-[#2a2730]"
            onClick={() => openCsSupport()}
          >
            在线客服
          </button>
        </div>
      </section>
    </div>
  );
}
