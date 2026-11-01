/**
 * Workspace / 工作台 — Vue home/workplace.vue (button playground stub).
 * Route: /workspace
 */
import { Button, Card } from "@dreamer/ui-view";
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";

export async function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

export default function WorkspacePage(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  return (
    <div class="space-y-4" data-testid="workspace">
      <h1 class="text-xl font-bold">{tr("workspace.title")}</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">{tr("workspace.intro")}</p>
      <Card bordered title={tr("workspace.buttons")}>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="primary">primary</Button>
          <Button type="button" variant="success">success</Button>
          <Button type="button" variant="secondary">secondary</Button>
          <Button type="button" variant="warning">warning</Button>
          <Button type="button" variant="danger">danger</Button>
          <Button type="button" variant="primary" loading>Loading</Button>
        </div>
      </Card>
    </div>
  );
}
