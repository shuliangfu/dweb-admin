/**
 * Generic settings stub — Card + Descriptions (Vue CardView shape).
 */
import { Button, Card, Descriptions, message } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { reload } from "@backend/components/crud-kit.tsx";
import type { StubPage } from "@common/stubs/catalog.ts";

export function StubSettings(props: { locale: Locale; page: StubPage }) {
  const tr = createT(props.locale);
  const loc = props.locale;
  const items = props.page.settings.map((s) => ({
    label: s.label[loc] ?? s.label["en-US"],
    children: s.value,
  }));
  return (
    <div data-testid={`stub-settings-${props.page.key}`}>
    <Card
      bordered
      size="sm"
      class="adm-panel-card"
      headerClass="adm-card-header"
      title={props.page.title[loc] ?? props.page.title["en-US"]}
      extra={
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => message.info(tr("stub.soon"))}
          >
            {tr("stub.edit")}
          </Button>
          <Button type="button" variant="secondary" onClick={reload}>
            {tr("stub.refresh")}
          </Button>
        </div>
      }
      bodyClass="pt-3"
    >
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">{tr("stub.settingsHint")} · {tr("stub.authNote")}</p>
      <Descriptions class="adm-desc-chrome" bordered size="sm" column={1} items={items} />
    </Card>
    </div>
  );
}
