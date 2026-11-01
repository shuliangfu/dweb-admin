/**
 * Dashboard (/) — Vue home/dashboard.vue shape: KPI cards + charts via @dreamer/ui-view Chart*.
 * Numbers are demo placeholders until user/finance services land.
 */
import { Card, ChartBar, ChartDoughnut, ChartLine, IconUsers } from "@dreamer/ui-view";
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";

export async function load(ctx: LoadContext) {
  const locale = resolveLocale(ctx.req);
  const { getCurrentUser } = await import("@common/service/auth.ts");
  const { buildMenuTree } = await import("@common/service/menu.ts");
  const { AdminUser } = await import("@common/model/mod.ts");
  const user = await getCurrentUser(ctx.req);
  const tree = user ? await buildMenuTree(user.roleCodes, locale) : [];
  const menuCount = tree.reduce((n, m) => n + 1 + m.children.length, 0);
  let adminTotal = 0;
  try {
    adminTotal = await AdminUser.count({});
  } catch { /* mongo optional during check */ }
  return {
    locale,
    name: user?.nickname ?? "",
    roles: user?.roleCodes ?? [],
    menuCount,
    adminTotal,
  };
}

type Data = {
  locale?: Locale;
  name?: string;
  roles?: string[];
  menuCount?: number;
  adminTotal?: number;
};

const lineData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "visits",
      data: [12, 19, 8, 15, 22, 18, 25],
      borderColor: "#3c8dbc",
      backgroundColor: "rgba(60,141,188,0.2)",
      tension: 0.3,
      fill: true,
    },
  ],
};

const barData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "income",
      data: [40, 55, 48, 70, 62, 80],
      backgroundColor: "#00a65a",
    },
  ],
};

const doughnutData = {
  labels: ["active", "new", "zombie"],
  datasets: [
    {
      data: [62, 24, 14],
      backgroundColor: ["#3c8dbc", "#00c0ef", "#dd4b39"],
    },
  ],
};

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

export default function Home(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  const tr = createT(d.locale ?? "zh-CN");
  const kpis = [
    { key: "admins", label: tr("dashboard.kpiAdmins"), value: d.adminTotal ?? 0, tone: "bg-sky-500/10 text-sky-600" },
    { key: "menus", label: tr("dashboard.kpiMenus"), value: d.menuCount ?? 0, tone: "bg-emerald-500/10 text-emerald-600" },
    { key: "roles", label: tr("dashboard.kpiRoles"), value: (d.roles ?? []).length, tone: "bg-amber-500/10 text-amber-600" },
    { key: "demo", label: tr("dashboard.kpiDemo"), value: 128, tone: "bg-rose-500/10 text-rose-600" },
  ];

  return (
    <div class="space-y-5" data-testid="dashboard">
      <section>
        <h1 class="text-2xl font-bold">{tr("dashboard.welcome", { name: d.name ?? "" })}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr("dashboard.intro")}</p>
      </section>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card bordered size="sm" data-testid={`kpi-${k.key}`}>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                <p class="m-0 mt-1 text-2xl font-semibold">{k.value}</p>
              </div>
              <span class={`inline-flex h-10 w-10 items-center justify-center rounded-full ${k.tone}`}>
                <IconUsers size="sm" />
              </span>
            </div>
          </Card>
        ))}
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card bordered class="lg:col-span-2" title={tr("dashboard.chartVisits")} bodyClass="pt-2">
          <div class="h-64">
            <ChartLine data={lineData} options={chartOpts} class="h-full w-full" height={256} />
          </div>
        </Card>
        <Card bordered title={tr("dashboard.chartMembers")} bodyClass="pt-2">
          <div class="h-64">
            <ChartDoughnut
              data={doughnutData}
              options={{ responsive: true, maintainAspectRatio: false }}
              class="h-full w-full"
              height={256}
            />
          </div>
        </Card>
        <Card bordered class="lg:col-span-3" title={tr("dashboard.chartIncome")} bodyClass="pt-2">
          <div class="h-56">
            <ChartBar data={barData} options={chartOpts} class="h-full w-full" height={224} />
          </div>
        </Card>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card bordered>
          <p class="text-sm text-slate-500">{tr("dashboard.yourRoles")}</p>
          <p class="mt-1 text-lg font-semibold" data-testid="roles">{(d.roles ?? []).join(", ") || "—"}</p>
        </Card>
        <Card bordered>
          <p class="text-sm text-slate-500">{tr("dashboard.menuCount")}</p>
          <p class="mt-1 text-lg font-semibold" data-testid="menu-count">{d.menuCount ?? 0}</p>
        </Card>
      </section>
    </div>
  );
}
