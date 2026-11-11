/**
 * Mobile about — App settings/info list with richer product facts
 * 路由: /about
 * marker: APP_ABOUT_RICH_COPY_20261107
 */

const rows = [
  { label: "应用", value: "Dweb Admin" },
  { label: "定位", value: "后台模板配套手机端" },
  { label: "端形态", value: "App 壳 · 底 Tab" },
  { label: "管理能力", value: "账号／RBAC／菜单／CMS" },
  { label: "在线客服", value: "整页会话，非浮窗" },
  { label: "多端", value: "Backend · FE · Mobile · API" },
  { label: "技术", value: "Deno · @dreamer/dweb" },
];

export default function About() {
  return (
    <div>
      <section
        class="relative overflow-hidden bg-[#0d1020] px-5 pb-7 text-white"
        style="padding-top: calc(env(safe-area-inset-top) + 12px)"
      >
        <div class="mb-3 mt-2 grid h-14 w-14 place-items-center rounded-[18px] bg-white/15 text-[22px] font-extrabold">
          D
        </div>
        <h1 class="m-0 text-[26px] font-bold tracking-tight">关于</h1>
        <p class="m-0 mt-2 text-[13px] leading-[1.6] text-[#c9c6d6]">
          dweb-admin：Deno 后台管理模板。本端用原生 App
          信息架构介绍产品，并用整页客服承接咨询；管理与接待在后台完成。
        </p>
      </section>

      <div class="flex flex-col gap-3.5 px-4 pt-4">
        <section class="rounded-[20px] border border-[#e8e2d8] bg-[#fffcf8] px-4 dark:border-slate-700 dark:bg-slate-900">
          <ul class="m-0 list-none p-0">
            {rows.map((row, i) => (
              <li
                class={`flex items-center justify-between gap-3 py-3 text-[13px] ${
                  i === 0 ? "" : "border-t border-[#f0ebe3] dark:border-slate-800"
                }`}
              >
                <span class="shrink-0 text-[#8a8490]">{row.label}</span>
                <span class="text-right font-semibold text-[#12101a] dark:text-slate-100">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section class="rounded-[20px] border border-[#e8e2d8] bg-[#fffcf8] p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 class="m-0 text-[13px] font-bold text-[#3f3a45] dark:text-slate-200">
            和 Web 前台的区别
          </h3>
          <p class="m-0 mt-2 text-[13px] leading-[1.7] text-[#5c5665] dark:text-slate-300">
            Web 前台可偏门户介绍；本 App 保持顶栏＋底 Tab、分区卡／列表，客服是满屏聊天页，首页无常驻浮标。
          </p>
        </section>

        <a
          href="/support"
          class="flex h-12 items-center justify-center rounded-[14px] bg-[#12101a] text-[15px] font-bold text-[#fffcf8] no-underline active:bg-[#2a2730]"
        >
          打开在线客服
        </a>
      </div>
    </div>
  );
}
