/**
 * Chart / tree placeholder (member map, invite/placement trees).
 */
import { Card, Button, message } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { reload } from "@backend/components/crud-kit.tsx";
import type { StubPage } from "@common/stubs/catalog.ts";

export function StubChart(props: { locale: Locale; page: StubPage }) {
  const tr = createT(props.locale);
  const loc = props.locale;
  return (
    <div data-testid={`stub-chart-${props.page.key}`}>
    <Card
      bordered
      size="sm"
      title={props.page.title[loc] ?? props.page.title["en-US"]}
      extra={
        <Button type="button" variant="secondary" onClick={reload}>
          {tr("stub.refresh")}
        </Button>
      }
      bodyClass="pt-3"
    >
      <div class="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
        <p class="m-0 text-sm text-slate-500 dark:text-slate-400">{tr("stub.chartHint")} · {tr("stub.authNote")}</p>
        <Button type="button" variant="primary" onClick={() => message.info(tr("stub.soon"))}>
          {tr("stub.soon")}
        </Button>
      </div>
    </Card>
    </div>
  );
}
