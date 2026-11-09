/**
 * Home — product intro (substantive, not slogan-only)
 * 路由: /
 * marker: FE_HOME_RICH_COPY_20261107
 */

import { openCsSupport } from "@frontend/components/cs-support-open.ts";

const capabilities = [
  {
    title: "账号与安全",
    body:
      "管理员账号、登录验证码、锁屏与会话在线列表；支持 Passkey／安全挑战等账号安全能力，便于团队安全入驻。",
    icon: "盾",
    tone: "feat" as const,
  },
  {
    title: "权限与 RBAC",
    body:
      "角色、权限项、路由图与权限分配一体：按角色控制菜单与接口可见范围，贴近 Yii2 风格后台权限模型。",
    icon: "钥",
    tone: "t2" as const,
  },
  {
    title: "在线客服",
    body:
      "访客可从本站或手机端发起会话，WebSocket 实时同步到管理端接待窗；无需登录即可咨询。",
    icon: "聊",
    tone: "t3" as const,
  },
  {
    title: "多端协同",
    body:
      "同仓覆盖管理后台、Web 前台、手机端与 API：业务配置在后台，访客触达在前台／手机，接口层统一对接。",
    icon: "联",
    tone: "wide" as const,
  },
];

const modules = [
  {
    no: "01",
    title: "会员管理",
    body: "会员列表、活跃与僵尸分册，便于运营按活跃度筛查（模板页可按业务接真模型）。",
    band: "bg-[#4f46e5]",
  },
  {
    no: "02",
    title: "内容／CMS",
    body: "文章、新闻、公告、图集等叶子页，支撑站内内容运营与公告发布。",
    band: "bg-[#7c3aed]",
  },
  {
    no: "03",
    title: "系统与开发",
    body: "基本设置、地区、时间等系统项；开发侧含菜单管理，侧栏结构可配置。",
    band: "bg-[#f59e0b]",
  },
  {
    no: "04",
    title: "数据面板约定",
    body: "列表统一搜索、列显隐、导入导出与打印等 DataPanel 能力，减少各页重复造轮子。",
    band: "bg-[#10b981]",
  },
];

const ends = [
  { name: "01  BACKEND", role: "管理控制台：RBAC、客服接待、内容与系统配置" },
  { name: "02  FRONTEND", role: "Web 访客门户：产品介绍与客服入口" },
  { name: "03  MOBILE", role: "手机 App 壳：底栏导航、整页客服会话" },
  { name: "04  API", role: "对外／跨端接口与实时客服 WS 通道" },
];

const barHeights = ["46%", "62%", "40%", "78%", "58%", "88%", "70%"];

function AdminWindowMock() {
  return (
    <div class="overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-b from-[#1a1f35] to-[#12162a] shadow-[0_40px_80px_rgba(0,0,0,0.45)] [transform:rotate(-1.2deg)]">
      <div class="flex h-10 items-center gap-1.5 border-b border-white/[0.06] bg-[#0f1324] px-3.5">
        <span class="h-2 w-2 rounded-full bg-[#f87171]" />
        <span class="h-2 w-2 rounded-full bg-[#fbbf24]" />
        <span class="h-2 w-2 rounded-full bg-[#34d399]" />
      </div>
      <div class="grid min-h-[360px] grid-cols-[72px_1fr]">
        <div class="flex flex-col gap-2 bg-[#0c1020] px-2 py-3">
          <div class="h-2.5 w-[70%] rounded bg-indigo-500" />
          <div class="h-2.5 rounded bg-white/12" />
          <div class="h-2.5 rounded bg-white/12" />
          <div class="h-2.5 w-1/2 rounded bg-white/12" />
          <div class="h-2.5 rounded bg-white/12" />
        </div>
        <div class="bg-gradient-to-b from-[#171c31] to-[#101426] p-3.5">
          <div class="grid grid-cols-2 gap-2">
            {[
              ["会员总数", "1,286"],
              ["今日咨询", "24"],
              ["活跃会员", "862"],
              ["本月收入", "64,110"],
            ].map(([label, value]) => (
              <div class="rounded-[10px] border border-white/[0.06] bg-white/[0.04] p-2.5">
                <span class="block text-[10px] text-[#8b88a3]">{label}</span>
                <strong class="mt-1 block text-lg font-semibold text-white">
                  {value}
                </strong>
              </div>
            ))}
          </div>
          <div class="mt-4 flex h-[90px] items-end gap-2 px-1">
            {barHeights.map((h) => (
              <i
                class="flex-1 rounded-t bg-gradient-to-b from-indigo-400 to-indigo-600"
                style={`height:${h}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* Dark full-bleed hero (header above is same #0d1020) */}
      <section class="relative overflow-hidden bg-[#0d1020] text-white">
        <div
          class="pointer-events-none absolute -right-[40px] -top-[180px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.55),transparent_68%)] blur-sm"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute -bottom-20 -left-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22),transparent_70%)] blur-sm"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute left-[38%] top-20 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.4),transparent_70%)] blur-sm"
          aria-hidden="true"
        />
        <div class="relative z-[1] mx-auto grid max-w-[1440px] items-center gap-10 px-6 pb-20 pt-6 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-16 lg:pb-20 lg:pt-6">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-1.5 pr-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#c7c4ff]">
              <span class="h-2 w-2 rounded-full bg-emerald-400" />
              DENO · 多端门户
            </div>
            <h1 class="mb-4 mt-[22px] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
              把后台、门户与客服
              <br />
              收进同一套{" "}
              <em class="bg-gradient-to-r from-indigo-300 via-violet-300 to-amber-200 bg-clip-text not-italic text-transparent">
                可运行模板
              </em>
            </h1>
            <p class="max-w-[560px] text-base leading-[1.7] text-[#c9c6d6] sm:text-lg">
              dweb-admin 用 @dreamer/dweb 与 @dreamer/view
              重写管理控制台：账号、权限、内容运营与实时客服开箱可用，并配套
              Web／手机访客端。
            </p>
            <p class="mt-3 max-w-[540px] text-sm leading-[1.7] text-[#9b97ab]">
              适合作为业务后台起点。前台与手机端负责介绍产品、承接访客咨询。
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="contact-cs"
                class="inline-flex h-12 items-center justify-center rounded-[14px] bg-white px-[22px] text-[15px] font-semibold text-[#2c28b0] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:bg-[#f4f0ea]"
                onClick={() => openCsSupport()}
              >
                在线客服
              </button>
              <a
                href="/about"
                class="inline-flex h-12 items-center justify-center rounded-[14px] border border-white/20 bg-transparent px-[22px] text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                了解更多
              </a>
            </div>
            <div class="mt-9 flex flex-wrap gap-7 text-[13px] text-[#b7b3c5]">
              <div>
                <b class="block text-xl font-bold tracking-tight text-white">4</b>
                端一体协同
              </div>
              <div>
                <b class="block text-xl font-bold tracking-tight text-white">
                  RBAC
                </b>
                角色权限开箱
              </div>
              <div>
                <b class="block text-xl font-bold tracking-tight text-white">0</b>
                登录即可咨询
              </div>
            </div>
          </div>
          <div class="hidden lg:block">
            <AdminWindowMock />
          </div>
        </div>
      </section>

      {/* 4-in-1 featured */}
      <section class="px-6 py-[72px] sm:px-10 lg:px-16">
        <div class="mx-auto grid max-w-[1440px] items-center gap-10 rounded-[28px] border border-[#e8e2d8] bg-[#fffcf8] px-8 py-10 shadow-[0_20px_50px_rgba(18,16,26,0.04)] dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[280px_1fr] lg:px-12">
          <div class="mx-auto flex h-60 w-60 flex-col items-center justify-center rounded-[32px] bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#f59e0b] text-white shadow-[0_24px_40px_rgba(79,70,229,0.28)]">
            <strong class="text-[88px] leading-none tracking-tighter">4</strong>
            <span class="mt-1.5 text-base opacity-90">端一体</span>
          </div>
          <div>
            <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#4f46e5]">
              它是什么
            </p>
            <h2 class="mb-3 text-2xl font-bold tracking-tight text-[#12101a] dark:text-slate-50 sm:text-[32px]">
              不是单一落地页，而是可运行的管理后台与访客触达。
            </h2>
            <p class="m-0 text-[15px] leading-[1.75] text-[#6b6570] dark:text-slate-300">
              backend 提供 Yii2 风格的角色／权限／路由与管理员体系；frontend 与
              mobile 面向访客介绍产品并接入在线客服；api
              承载跨端接口与实时会话通道。列表页遵循统一 DataPanel
              约定，壳层含侧栏、顶栏、多标签与登录／锁屏，便于在真实业务上继续扩展。
            </p>
          </div>
        </div>
      </section>

      {/* Bento capabilities */}
      <section class="px-6 pb-[72px] sm:px-10 lg:px-16">
        <div class="mx-auto max-w-[1440px]">
          <p class="mb-2.5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[#4f46e5]">
            能力
          </p>
          <h2 class="mb-2 text-center text-2xl font-bold tracking-tight text-[#12101a] dark:text-slate-50 sm:text-[32px]">
            能做什么
          </h2>
          <p class="mb-7 text-center text-[15px] text-[#6b6570] dark:text-slate-400">
            下列能力对应仓内已落地模块，而非空口号。
          </p>
          <div class="grid gap-4 md:grid-cols-3 md:grid-rows-[auto_auto]">
            {capabilities.map((f) => {
              if (f.tone === "feat") {
                return (
                  <div class="relative min-h-[360px] overflow-hidden rounded-[24px] border border-transparent bg-gradient-to-b from-[#1a1630] to-[#12101f] p-6 text-white shadow-[0_10px_30px_rgba(18,16,26,0.03)] md:row-span-2">
                    <div class="mb-4 grid h-11 w-11 place-items-center rounded-[14px] bg-white/12 text-lg text-[#c7c4ff]">
                      {f.icon}
                    </div>
                    <h3 class="mb-2 text-lg font-semibold">{f.title}</h3>
                    <p class="m-0 text-sm leading-[1.7] text-[#c9c4d8]">
                      {f.body}
                    </p>
                  </div>
                );
              }
              const ico =
                f.tone === "t2"
                  ? "bg-[#ede9fe] text-[#6d28d9]"
                  : f.tone === "t3"
                  ? "bg-[#fef3c7] text-[#b45309]"
                  : "bg-[#d1fae5] text-[#047857]";
              return (
                <div
                  class={`min-h-[170px] rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] p-6 shadow-[0_10px_30px_rgba(18,16,26,0.03)] dark:border-slate-700 dark:bg-slate-900 ${
                    f.tone === "wide" ? "md:col-span-2" : ""
                  }`}
                >
                  <div
                    class={`mb-4 grid h-11 w-11 place-items-center rounded-[14px] text-lg ${ico}`}
                  >
                    {f.icon}
                  </div>
                  <h3 class="mb-2 text-lg font-semibold text-[#12101a] dark:text-slate-50">
                    {f.title}
                  </h3>
                  <p class="m-0 text-sm leading-[1.7] text-[#5c5665] dark:text-slate-300">
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section class="px-6 pb-[72px] sm:px-10 lg:px-16">
        <div class="mx-auto max-w-[1440px]">
          <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#4f46e5]">
            模块
          </p>
          <h2 class="mb-7 text-2xl font-bold tracking-tight text-[#12101a] dark:text-slate-50 sm:text-[32px]">
            后台业务模块
          </h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((m) => (
              <div class="overflow-hidden rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] shadow-[0_10px_30px_rgba(18,16,26,0.03)] dark:border-slate-700 dark:bg-slate-900">
                <div class={`h-2 ${m.band}`} />
                <div class="px-5 pb-6 pt-[22px]">
                  <div class="mb-2 text-xs font-bold tracking-[0.12em] text-[#9b97ab]">
                    {m.no}
                  </div>
                  <h3 class="mb-2 text-[17px] font-semibold text-[#12101a] dark:text-slate-50">
                    {m.title}
                  </h3>
                  <p class="m-0 text-[13px] leading-[1.7] text-[#5c5665] dark:text-slate-300">
                    {m.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ends strip */}
      <section class="px-6 pb-[72px] sm:px-10 lg:px-16">
        <div class="mx-auto max-w-[1440px]">
          <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#4f46e5]">
            分工
          </p>
          <h2 class="mb-2 text-2xl font-bold tracking-tight text-[#12101a] dark:text-slate-50 sm:text-[32px]">
            多端怎么分工
          </h2>
          <p class="mb-7 text-[15px] leading-[1.75] text-[#6b6570] dark:text-slate-400">
            同一产品、不同触达面：管理在后台，介绍与咨询在访客端。
          </p>
          <div class="overflow-hidden rounded-[28px] border border-[#e8e2d8] bg-[#fffcf8] dark:border-slate-700 dark:bg-slate-900 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {ends.map((e, i) => (
              <div
                class={`relative px-6 py-7 ${
                  i < ends.length - 1
                    ? "lg:after:absolute lg:after:bottom-7 lg:after:right-0 lg:after:top-7 lg:after:w-px lg:after:bg-[#eee8de]"
                    : ""
                }`}
              >
                <div class="mb-2 text-[13px] font-bold tracking-wide text-[#4f46e5]">
                  {e.name}
                </div>
                <p class="m-0 text-sm leading-[1.65] text-[#5c5665] dark:text-slate-300">
                  {e.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section class="px-6 pb-16 sm:px-10 lg:px-16">
        <div class="relative mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#151327] via-[#2a1f66] to-[#4f46e5] px-8 py-12 text-white shadow-[0_30px_60px_rgba(79,70,229,0.22)] sm:flex-row sm:items-center sm:px-14">
          <div
            class="pointer-events-none absolute -right-10 -top-20 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.28),transparent_70%)]"
            aria-hidden="true"
          />
          <div class="relative">
            <h2 class="m-0 text-2xl font-bold tracking-tight sm:text-[28px]">
              需要人工协助？
            </h2>
            <p class="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-[#d5d0ea]">
              点右下角或下方按钮即可打开在线客服浮窗；切页保活，消息实时同步到管理端接待窗，无需先注册账号。
            </p>
          </div>
          <button
            type="button"
            class="relative inline-flex h-12 shrink-0 items-center justify-center rounded-[14px] bg-white px-[22px] text-[15px] font-semibold text-[#2c28b0] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:bg-[#f4f0ea]"
            onClick={() => openCsSupport()}
          >
            打开在线客服浮窗
          </button>
        </div>
      </section>
    </div>
  );
}
