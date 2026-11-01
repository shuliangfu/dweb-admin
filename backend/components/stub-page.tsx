/**
 * Factory helpers for catalog-driven stub routes.
 */
import type { LoadContext } from "@dreamer/dweb";
import { resolveLocale, type Locale } from "@common/i18n/mod.ts";
import { STUB_BY_KEY, type StubPage } from "@common/stubs/catalog.ts";
import { StubSettings } from "@backend/components/StubSettings.tsx";
import { StubDatetime } from "@backend/components/StubDatetime.tsx";
import { StubChart } from "@backend/components/StubChart.tsx";

export function stubLoad(key: string) {
  return async (ctx: LoadContext) => {
    const page = STUB_BY_KEY[key];
    if (!page) throw new Error(`Unknown stub page: ${key}`);
    const locale = resolveLocale(ctx.req);
    return { locale, pageKey: key };
  };
}

type Data = { locale?: Locale; pageKey?: string};

export function StubPageView(props: { data?: Data; pageKey: string }) {
  const locale = props.data?.locale ?? "zh-CN";
  const key = props.data?.pageKey ?? props.pageKey;
  const page = STUB_BY_KEY[key] as StubPage | undefined;
  if (!page) {
    return <div class="p-4 text-sm text-danger-600">Unknown stub: {key}</div>;
  }
  if (page.key === "system.datetime") return <StubDatetime locale={locale} page={page} />;
  if (page.kind === "settings") return <StubSettings locale={locale} page={page} />;
  if (page.kind === "chart") return <StubChart locale={locale} page={page} />;
  return <div class="p-4 text-sm text-slate-500">{page.title[locale]}</div>;
}
