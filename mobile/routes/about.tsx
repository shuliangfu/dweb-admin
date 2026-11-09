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
    <div class="space-y-4">
      <section class="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <p class="m-0 text-base font-semibold text-slate-900 dark:text-slate-50">
            关于
          </p>
          <p class="m-0 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            dweb-admin：Deno 后台管理模板。本端用原生 App 信息架构介绍产品，并用整页客服承接咨询；管理与接待在后台完成。
          </p>
        </div>
        <ul class="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {rows.map((row) => (
            <li class="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm">
              <span class="shrink-0 text-slate-500">{row.label}</span>
              <span class="text-right font-medium text-slate-800 dark:text-slate-100">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section class="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 class="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
          和 Web 前台的区别
        </h3>
        <p class="m-0 mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Web 前台可偏门户介绍；本 App 保持顶栏＋底 Tab、分区卡／列表，客服是满屏聊天页，首页无常驻浮标。
        </p>
      </section>

      <a
        href="/support"
        class="flex min-h-12 items-center justify-center rounded-[10px] bg-indigo-600 px-4 text-[15px] font-semibold text-white shadow-sm active:bg-indigo-700"
      >
        打开在线客服
      </a>
    </div>
  );
}
