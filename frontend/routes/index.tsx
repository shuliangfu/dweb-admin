/**
 * Home — product intro (substantive, not slogan-only)
 * 路由: /
 * marker: FE_HOME_RICH_COPY_20261107
 */

import { Button, Card } from "@dreamer/ui-view";
import { openCsSupport } from "@frontend/components/cs-support-open.ts";

const capabilities = [
  {
    title: "账号与安全",
    body:
      "管理员账号、登录验证码、锁屏与会话在线列表；支持 Passkey／安全挑战等账号安全能力，便于团队安全入驻。",
  },
  {
    title: "权限与 RBAC",
    body:
      "角色、权限项、路由图与权限分配一体：按角色控制菜单与接口可见范围，贴近 Yii2 风格后台权限模型。",
  },
  {
    title: "在线客服",
    body:
      "访客可从本站或手机端发起会话，WebSocket 实时同步到管理端接待窗；无需登录即可咨询。",
  },
  {
    title: "多端协同",
    body:
      "同仓覆盖管理后台、Web 前台、手机端与 API：业务配置在后台，访客触达在前台／手机，接口层统一对接。",
  },
];

const modules = [
  {
    title: "会员管理",
    body: "会员列表、活跃与僵尸分册，便于运营按活跃度筛查（模板页可按业务接真模型）。",
  },
  {
    title: "内容／CMS",
    body: "文章、新闻、公告、图集等叶子页，支撑站内内容运营与公告发布。",
  },
  {
    title: "系统与开发",
    body: "基本设置、地区、时间等系统项；开发侧含菜单管理，侧栏结构可配置。",
  },
  {
    title: "数据面板约定",
    body: "列表统一搜索、列显隐、导入导出与打印等 DataPanel 能力，减少各页重复造轮子。",
  },
];

const ends = [
  { name: "Backend", role: "管理控制台：RBAC、客服接待、内容与系统配置" },
  { name: "Frontend", role: "Web 访客门户：产品介绍与客服入口" },
  { name: "Mobile", role: "手机 App 壳：底栏导航、整页客服会话" },
  { name: "API", role: "对外／跨端接口与实时客服 WS 通道" },
];

export default function Home() {
  return (
    <div class="space-y-12">
      <section class="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-14 shadow-sm dark:border-indigo-900/40 sm:px-10 sm:py-16">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
        <div class="relative mx-auto max-w-3xl text-center">
          <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Dweb Admin
          </p>
          <h1 class="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            基于 Deno 的后台管理模板与多端门户
          </h1>
          <p class="mx-auto mb-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            dweb-admin 是用{" "}
            <span class="text-indigo-200">@dreamer/dweb</span>
            {" "}
            与{" "}
            <span class="text-indigo-200">@dreamer/view</span>
            {" "}
            重写的管理控制台：把账号、权限、内容运营与实时客服放进同一套可运行模板，并配套 Web／手机访客端。
          </p>
          <p class="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-slate-400">
            适合作为业务后台起点：侧栏菜单、RBAC、数据列表面板与客服通道开箱可用；前台与手机端负责介绍产品、承接访客咨询。
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a href="/about" class="inline-block">
              <Button type="button" variant="secondary" class="h-11 px-6 text-base">
                了解更多
              </Button>
            </a>
            <Button
              type="button"
              variant="primary"
              class="h-11 px-6 text-base"
              data-testid="contact-cs"
              onClick={() => openCsSupport()}
            >
              在线客服
            </Button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-10">
        <h2 class="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-100">
          它是什么
        </h2>
        <div class="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          <p>
            dweb-admin 不是单一落地页，而是「管理后台 + 访客触达」的完整应用仓：
            <strong class="font-semibold text-slate-800 dark:text-slate-100">
              backend
            </strong>
            {" "}
            提供 Yii2 风格的角色／权限／路由与管理员体系；
            <strong class="font-semibold text-slate-800 dark:text-slate-100">
              frontend
            </strong>
            {" "}
            与
            {" "}
            <strong class="font-semibold text-slate-800 dark:text-slate-100">
              mobile
            </strong>
            {" "}
            面向访客介绍产品并接入在线客服；
            <strong class="font-semibold text-slate-800 dark:text-slate-100">
              api
            </strong>
            {" "}
            承载跨端接口与实时会话通道。
          </p>
          <p>
            列表页遵循统一 DataPanel 约定（搜索、列显隐、导入导出等），壳层含侧栏、顶栏、多标签与登录／锁屏，便于在真实业务上继续扩展会员、CMS 与系统配置。
          </p>
        </div>
      </section>

      <section>
        <h2 class="mb-2 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
          能做什么
        </h2>
        <p class="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
          下列能力对应仓内已落地模块，而非空口号。
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {capabilities.map((f) => (
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

      <section>
        <h2 class="mb-6 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
          后台业务模块
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <Card
              bordered
              class="h-full bg-white dark:bg-slate-900"
              title={m.title}
            >
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {m.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-800 dark:bg-slate-900/60 sm:px-10">
        <h2 class="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          多端怎么分工
        </h2>
        <p class="mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          同一产品、不同触达面：管理在后台，介绍与咨询在访客端。
        </p>
        <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {ends.map((e) => (
            <li class="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <p class="m-0 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {e.name}
              </p>
              <p class="m-0 mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {e.role}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section class="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-6 py-8 text-center dark:border-indigo-900/40 dark:bg-indigo-950/30 sm:px-10">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          需要人工协助？
        </h2>
        <p class="mb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          点右下角或下方按钮即可打开在线客服浮窗；切页保活，消息实时同步到管理端接待窗，无需先注册账号。
        </p>
        <Button type="button" variant="primary" onClick={() => openCsSupport()}>
          打开在线客服浮窗
        </Button>
      </section>
    </div>
  );
}
