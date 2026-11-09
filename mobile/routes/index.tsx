/**
 * Mobile home — App shell info architecture with rich product intro
 * 路由: /
 * marker: APP_HOME_RICH_COPY_20261107
 * Keep: floating bottom tabs from _layout; immersive gradient hero; no float FAB
 */

const shortcuts = [
  {
    href: "/support",
    testId: "contact-cs",
    title: "在线客服",
    desc: "整页会话，无需登录",
    kind: "chat" as const,
    primary: true,
  },
  {
    href: "/about",
    title: "关于应用",
    desc: "版本与技术栈",
    kind: "info" as const,
    primary: false,
  },
];

function ShortcutIcon({ kind, light }: { kind: "chat" | "info"; light?: boolean }) {
  const stroke = light ? "#fff" : "#4f46e5";
  if (kind === "chat") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-[22px] w-[22px]"
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
      stroke={stroke}
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-[22px] w-[22px]"
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
    desc: "验证码登录、锁屏、Passkey；会话可在线查看。",
    icon: "盾",
    ico: "bg-[#e0e7ff] text-[#3730a3]",
  },
  {
    title: "权限 RBAC",
    desc: "角色、权限、路由图与分配，贴近 Yii2 模型。",
    icon: "钥",
    ico: "bg-[#ede9fe] text-[#6d28d9]",
  },
  {
    title: "在线客服",
    desc: "底栏进入整页聊天，消息同步到管理端。",
    icon: "聊",
    ico: "bg-[#fef3c7] text-[#b45309]",
  },
  {
    title: "多端协同",
    desc: "后台管配置与接待；本 App 做介绍与咨询。",
    icon: "联",
    ico: "bg-[#d1fae5] text-[#047857]",
  },
];

const overview = [
  { label: "在线客服入口", value: "底栏整页" },
  { label: "登录要求", value: "访客无需登录" },
  { label: "本端定位", value: "App 介绍＋咨询" },
  { label: "管理后台", value: "账号／权限／接待" },
];

export default function Home() {
  return (
    <div data-testid="mobile-app-home">
      <section
        class="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-[#151327] via-[#2e1f72] to-[#4f46e5] px-5 pb-7 text-white"
        style="padding-top: calc(env(safe-area-inset-top) + 12px)"
      >
        <div
          class="pointer-events-none absolute -right-[60px] -top-10 h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.35),transparent_70%)]"
          aria-hidden="true"
        />
        <p class="relative m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#c7c4ff]">
          你好
        </p>
        <h1 class="relative m-0 mt-1 text-[26px] font-bold tracking-tight">
          Dweb Admin
        </h1>
        <p class="relative m-0 mt-1.5 text-[13px] leading-[1.5] text-[#ddd6fe]">
          Deno 后台模板的配套手机端。用 App 壳介绍产品，并用整页客服承接咨询。
        </p>
        <div class="relative mt-4 flex items-center gap-2 rounded-[14px] border border-white/15 bg-white/10 px-3 py-2.5 text-[13px]">
          <span class="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          服务可用 · 访客可直接咨询
        </div>
      </section>

      <div class="flex flex-col gap-3.5 px-4 pt-4">
        <section class="grid grid-cols-2 gap-2.5">
          {shortcuts.map((item) => (
            <a
              href={item.href}
              data-testid={item.testId}
              class={`flex min-h-[118px] flex-col justify-between rounded-[20px] p-4 no-underline transition-transform active:scale-[0.98] ${
                item.primary
                  ? "bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white"
                  : "border border-[#e8e2d8] bg-[#fffcf8] text-[#12101a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              }`}
            >
              <ShortcutIcon kind={item.kind} light={item.primary} />
              <div>
                <strong class="block text-[15px] font-semibold">
                  {item.title}
                </strong>
                <span class="text-[11px] opacity-75">{item.desc}</span>
              </div>
            </a>
          ))}
        </section>

        <section class="rounded-[20px] border border-[#e8e2d8] bg-[#fffcf8] p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 class="m-0 mb-2.5 text-[13px] font-bold text-[#3f3a45] dark:text-slate-200">
            能做什么
          </h3>
          {capabilityRows.map((row, i) => (
            <div
              class={`flex gap-2.5 py-2.5 ${
                i === 0 ? "pt-0" : "border-t border-[#f0ebe3] dark:border-slate-800"
              }`}
            >
              <div
                class={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[13px] ${row.ico}`}
              >
                {row.icon}
              </div>
              <div>
                <b class="block text-[13px] text-[#12101a] dark:text-slate-50">
                  {row.title}
                </b>
                <p class="m-0 mt-0.5 text-[11px] leading-[1.5] text-[#6b6570] dark:text-slate-400">
                  {row.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section class="rounded-[20px] border border-[#e8e2d8] bg-[#fffcf8] p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 class="m-0 mb-2.5 text-[13px] font-bold text-[#3f3a45] dark:text-slate-200">
            今日概览
          </h3>
          <div class="grid grid-cols-2 gap-2">
            {overview.map((s) => (
              <div class="rounded-[14px] bg-[#f7f3ed] p-3 dark:bg-slate-800">
                <span class="block text-[11px] text-[#8a8490]">{s.label}</span>
                <b class="mt-1 block text-[13px] text-[#12101a] dark:text-slate-50">
                  {s.value}
                </b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
