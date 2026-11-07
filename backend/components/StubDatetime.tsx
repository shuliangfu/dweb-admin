/**
 * Vue system/datetime CardView: digital clock strip + settings rows (demo; no setTime API).
 */
import { onCleanup, onMount, createSignal } from "@dreamer/view";
import { Button, Card, Descriptions, message, IconClock } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { reload } from "@backend/components/crud-kit.tsx";
import type { StubPage } from "@common/stubs/catalog.ts";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatParts(d: Date): { date: string; time: string } {
  return {
    date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

export function StubDatetime(props: { locale: Locale; page: StubPage }) {
  const tr = createT(props.locale);
  const loc = props.locale;
  const now = createSignal(formatParts(new Date()));

  onMount(() => {
    const id = setInterval(() => {
      now.value = formatParts(new Date());
    }, 1000);
    onCleanup(() => clearInterval(id));
  });

  const items = props.page.settings.map((s) => ({
    label: s.label[loc] ?? s.label["en-US"],
    children: s.value,
  }));

  return (
    <div data-testid="stub-settings-system.datetime" class="grid gap-4">
      <Card
        bordered
        size="sm"
        class="adm-panel-card"
        headerClass="adm-card-header"
        title={props.page.title[loc] ?? props.page.title["en-US"]}
        extra={
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => message.info(tr("stub.soon"))}>
              {tr("stub.edit")}
            </Button>
            <Button type="button" variant="secondary" onClick={reload}>
              {tr("stub.refresh")}
            </Button>
          </div>
        }
        bodyClass="pt-3"
      >
        <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {tr("stub.settingsHint")} · {tr("stub.authNote")} · {tr("stub.datetimeDemo")}
        </p>
        <div class="adm-datetime-demo mb-4 flex flex-wrap items-center justify-center gap-4 py-6">
          <IconClock size="lg" class="text-slate-400 dark:text-slate-500" />
          <div class="text-center">
            <div class="mb-1 text-sm text-slate-500 dark:text-slate-400">{tr("stub.serverTime")}</div>
            {() => (
              <>
                <div class="adm-digital-clock text-3xl tracking-wider text-slate-800 dark:text-slate-100">
                  {now.value.date}
                </div>
                <div class="adm-digital-clock text-3xl tracking-wider text-slate-800 dark:text-slate-100">
                  {now.value.time}
                </div>
              </>
            )}
          </div>
        </div>
        <Descriptions class="adm-desc-chrome" bordered size="sm" column={1} items={items} />
      </Card>
    </div>
  );
}
