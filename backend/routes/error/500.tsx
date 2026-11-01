/**
 * Explicit /error/500 — Vue error/500.vue path parity.
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

export async function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

export default function Error500Page(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  return (
    <ErrorPage
      locale={locale}
      code={500}
      title={tr("error.page500Title")}
      message={tr("error.page500Message")}
      homeHref="/"
    />
  );
}
