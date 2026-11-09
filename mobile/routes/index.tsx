/**
 * Mobile home — App shell info architecture with rich product intro
 * 路由: /
 * marker: APP_HOME_RICH_COPY_20261107
 * Keep: top bar + bottom tabs from _layout; no marketing portal wall; no float FAB
 */

const shortcuts = [
  {
    href: "/support",
    testId: "contact-cs",
    title: "在线客服",
    desc: "整页即时会话",
    tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    kind: "chat" as const,
  },
  {
    href: "/about",
    title: "关于应用",
    desc: "版本与技术栈",
    tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    kind: "info" as const,
  },
];

function ShortcutIcon({ kind }: { kind: "chat" | "info" }) {
  if (kind === "chat") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V6.5z" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

const capabilityRows = [
  {
    title: "账号与安全",
    desc: "管理员账号、验证码登录、锁屏、Passkey／安全挑战；会话可在线查看。",
  },
  {
    title: "权限 RBAC",
    desc: "角色、权限、路由图与分配；按角色控制菜单与接口，贴近 Yii2 后台模型。",
  },
  {
    title: "在线客服",
    desc: "本页底栏进在线客服即可整页聊天；消息经 WS 同步到管理端，访客无需登录。",
  },
  {
    title: "多端协同",
    desc: "后台管配置与接待；Web／本 App 做介绍与咨询；API 统一接口与通道。",
  },
  {
    title: "内容与会员",
    desc: "CMS（文章／新闻／公告／图集）与会员分册（列表／活跃／僵尸）模板就绪。",
  },
  {
    title: "数据面板",
    desc: "列表统一搜索、列显隐、导入导出与打印，减少各业务页重复实现。",
  },
];

export default function Home() {
  return (
    <div class="space-y-4" data-testid="mobile-app-home">
      <section class="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
          你好
        </p>
        <h2 class="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Dweb Admin
        </h2>
        <div class="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/40">
          <span
            class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          <p class="m-0 text-sm text-emerald-800 dark:text-emerald-200">
            服务可用 · 访客可直接咨询
          </p>
        </div>
      </section>

      <section class="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 class="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
          产品简介
        </h3>
        <p class="m-0 mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          dweb-admin 是基于 Deno 与 @dreamer/dweb 的后台管理模板：管理端负责账号、权限、内容与客服接待；本 App 是配套手机端，用原生 App 壳（顶栏＋底 Tab）介绍产品并提供整页客服。
        </p>
        <p class="m-0 mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          适合作为业务后台起点——RBAC、数据列表面板、多端访客触达与实时会话通道已串通；会员／CMS 等业务页可按需接真模型继续扩展。
        </p>
      </section>

      <section>
        <h3 class="mb-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          快捷入口
        </h3>
        <div class="grid grid-cols-2 gap-3">
          {shortcuts.map((item) => (
            <a
              href={item.href}
              data-testid={item.testId}
              class={`flex min-h-[5.5rem] flex-col justify-between rounded-2xl px-3.5 py-3.5 border border-[#e2e8f0]/70 shadow-sm transition-transform active:scale-[0.98] ${item.tone}`}
            >
              <ShortcutIcon kind={item.kind} />
              <div>
                <p class="m-0 text-[15px] font-semibold">{item.title}</p>
                <p class="m-0 mt-0.5 text-xs opacity-70">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 class="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
            能做什么
          </h3>
          <p class="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
            对应仓内已落地能力，按条查阅
          </p>
        </div>
        <ul class="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {capabilityRows.map((row) => (
            <li class="px-4 py-3">
              <p class="m-0 text-[15px] font-medium text-slate-900 dark:text-slate-50">
                {row.title}
              </p>
              <p class="m-0 mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {row.desc}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section class="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 class="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
          今日概览
        </h3>
        <ul class="mt-3 m-0 list-none space-y-2.5 p-0">
          <li class="flex items-center justify-between text-sm">
            <span class="text-slate-500">在线客服入口</span>
            <span class="font-medium text-slate-800 dark:text-slate-100">
              底栏整页
            </span>
          </li>
          <li class="flex items-center justify-between text-sm">
            <span class="text-slate-500">登录要求</span>
            <span class="font-medium text-slate-800 dark:text-slate-100">
              访客无需登录
            </span>
          </li>
          <li class="flex items-center justify-between text-sm">
            <span class="text-slate-500">本端定位</span>
            <span class="font-medium text-slate-800 dark:text-slate-100">
              App 介绍＋咨询
            </span>
          </li>
          <li class="flex items-center justify-between text-sm">
            <span class="text-slate-500">管理后台</span>
            <span class="font-medium text-slate-800 dark:text-slate-100">
              账号／权限／接待
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
