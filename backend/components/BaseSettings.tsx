/**
 * 系统管理 / 基本设置 — website name and collapsed label are saved.
 * The other rows stay a preview; there is no general Config model.
 */
import { Button, Card, Descriptions, IconList, Input, Modal } from "@dreamer/ui-view";
import { createSignal } from "@dreamer/view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { STUB_BY_KEY } from "@common/stubs/catalog.ts";
import { api, reload, toastResult } from "@backend/components/crud-kit.tsx";

export function BaseSettings(props: { locale: Locale; website: string; shortName: string }) {
  const tr = createT(props.locale);
  const loc = props.locale;
  const open = createSignal(false);
  const website = createSignal(props.website);
  const shortName = createSignal(props.shortName);
  const page = STUB_BY_KEY["system.base"];
  const extras = (page?.settings ?? []).filter((s) => (s.label["zh-CN"] ?? "") !== "网站名称");

  const items = [
    { label: tr("base.website"), children: props.website },
    { label: tr("base.shortName"), children: props.shortName },
    ...extras.map((s) => ({
      label: s.label[loc] ?? s.label["en-US"],
      children: s.value,
    })),
  ];

  async function save(): Promise<void> {
    const r = await api("POST", "/api/site/base/update", {
      website: website.value,
      shortName: shortName.value,
    });
    if (!toastResult(r, tr("crud.saved"), tr("crud.networkError"))) return;
    open.value = false;
    reload();
  }

  return (
    <div data-testid="stub-settings-system.base">
      <Card
        bordered
        size="sm"
        class="adm-panel-card"
        headerClass="adm-card-header"
        title={
          <span class="inline-flex min-w-0 items-center gap-2">
            <IconList size="sm" />
            <span class="truncate">{tr("base.title")}</span>
          </span>
        }
        extra={
          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                website.value = props.website;
                shortName.value = props.shortName;
                open.value = true;
              }}
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
        <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">{tr("base.hint")}</p>
        <Descriptions class="adm-desc-chrome" bordered size="sm" column={1} items={items} />
      </Card>
      <Modal
        open={open}
        title={tr("base.title")}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
        footer={
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                open.value = false;
              }}
            >
              {tr("crud.cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={() => save()}>
              {tr("crud.confirm")}
            </Button>
          </div>
        }
        children={() => (
          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-1.5 text-sm">
              <span>{tr("base.website")}</span>
              <Input
                value={website}
                placeholder={tr("base.website")}
                onInput={(ev: Event) => {
                  website.value = (ev.target as { value?: string }).value ?? "";
                }}
              />
            </label>
            <label class="flex flex-col gap-1.5 text-sm">
              <span>{tr("base.shortName")}</span>
              <Input
                value={shortName}
                placeholder="DWEB"
                onInput={(ev: Event) => {
                  shortName.value = (ev.target as { value?: string }).value ?? "";
                }}
              />
            </label>
          </div>
        )}
      />
    </div>
  );
}
