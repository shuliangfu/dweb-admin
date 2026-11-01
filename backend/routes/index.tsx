/**
 * Dashboard (/) - Vue home/dashboard.vue shape.
 * Dashboard shows member KPIs, finance strip and charts (no live admin/menu/role cards).
 * DEMO (no Member/Finance models; docs/handoff.md): member KPIs, finance strip, charts.
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

/** Demo series — mirrors Vue publicStore.dashboard placeholders until domain APIs land. */
const demoMembers = { total: 1286, neu: 24, active: 862, zombie: 140 };
const demoFinance = {
  total: "128,560.00",
  today: "3,420.00",
  yesterday: "2,980.00",
  week: "18,240.00",
  month: "64,110.00",
};

const lineData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "visits",
      data: [12, 19, 8, 15, 22, 18, 25],
      borderColor: "#14b8a6",
      backgroundColor: "rgba(20,184,166,0.2)",
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
      backgroundColor: "#22c55e",
    },
  ],
};

const doughnutData = {
  labels: ["active", "new", "zombie"],
  datasets: [
    {
      data: [62, 24, 14],
      backgroundColor: ["#14b8a6", "#06b6d4", "#ef4444"],
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

  const memberKpis = [
    { key: "total", label: tr("dashboard.kpiMembersTotal"), value: demoMembers.total, tone: "bg-sky-500/10 text-sky-600" },
    { key: "new", label: tr("dashboard.kpiMembersNew"), value: demoMembers.neu, tone: "bg-cyan-500/10 text-cyan-600" },
    { key: "active", label: tr("dashboard.kpiMembersActive"), value: demoMembers.active, tone: "bg-emerald-500/10 text-emerald-600" },
    { key: "zombie", label: tr("dashboard.kpiMembersZombie"), value: demoMembers.zombie, tone: "bg-rose-500/10 text-rose-600" },
  ];

  const incomeBits = [
    { label: tr("dashboard.financeIncomeToday"), value: demoFinance.today },
    { label: tr("dashboard.financeIncomeYesterday"), value: demoFinance.yesterday },
    { label: tr("dashboard.financeIncomeWeek"), value: demoFinance.week },
    { label: tr("dashboard.financeIncomeMonth"), value: demoFinance.month },
  ];

  return (
    <div class="adm-dash" data-testid="dashboard">
      <section>
        <h1 class="text-2xl font-bold">{tr("dashboard.welcome", { name: d.name ?? "" })}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr("dashboard.intro")}</p>
      </section>

      {/* Vue home/dashboard.vue — member row */}
      <section class="adm-dash-grid grid grid-cols-2 lg:grid-cols-4" data-testid="dashboard-member-kpis">
        {memberKpis.map((k) => (
          <Card bordered size="sm" class="adm-panel-card" data-testid={`kpi-member-${k.key}`}>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="m-0 text-xs text-slate-500 dark:text-slate-400">
                  {k.label}
                  <span class="ml-1 rounded bg-slate-100 px-1 text-xs text-slate-400 dark:bg-slate-800">
                    {tr("dashboard.demoBadge")}
                  </span>
                </p>
                <p class="m-0 mt-1 text-2xl font-semibold">{k.value}</p>
              </div>
              <span class={`inline-flex h-10 w-10 items-center justify-center rounded-full ${k.tone}`}>
                <IconUsers size="sm" />
              </span>
            </div>
          </Card>
        ))}
      </section>

      {/* Vue finance income strip (demo) */}
      <Card bordered class="adm-panel-card" data-testid="dashboard-finance-strip">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="m-0 text-xs text-slate-500 dark:text-slate-400">
              {tr("dashboard.financeIncomeTotal")}
              <span class="ml-1 rounded bg-slate-100 px-1 text-xs text-slate-400 dark:bg-slate-800">
                {tr("dashboard.demoBadge")}
              </span>
            </p>
            <p class="m-0 mt-1 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
              {demoFinance.total}
            </p>
          </div>
          <div class="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {incomeBits.map((b) => (
              <div>
                <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{b.label}</p>
                <p class="m-0 mt-1 text-lg font-medium">{b.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <section class="adm-dash-grid grid grid-cols-1 lg:grid-cols-3" data-testid="dashboard-charts">
        <Card bordered class="adm-panel-card lg:col-span-2" title={tr("dashboard.chartVisits")} bodyClass="pt-2">
          <div class="h-64">
            <ChartLine data={lineData} options={chartOpts} class="h-full w-full" height={256} />
          </div>
        </Card>
        <Card bordered class="adm-panel-card" title={tr("dashboard.chartMembers")} bodyClass="pt-2">
          <div class="h-64">
            <ChartDoughnut
              data={doughnutData}
              options={{ responsive: true, maintainAspectRatio: false }}
              class="h-full w-full"
              height={256}
            />
          </div>
        </Card>
        <Card bordered class="adm-panel-card lg:col-span-3" title={tr("dashboard.chartIncome")} bodyClass="pt-2">
          <div class="h-56">
            <ChartBar data={barData} options={chartOpts} class="h-full w-full" height={224} />
          </div>
        </Card>
      </section>
    </div>
  );
}
