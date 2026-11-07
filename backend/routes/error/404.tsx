/**
 * Explicit /error/404 — Vue error/404.vue path parity.
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

export function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

export default function Error404Page(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  return (
    <ErrorPage
      locale={locale}
      code={404}
      title={tr("error.page404Title")}
      message={tr("error.page404Message")}
      homeHref="/"
    />
  );
}
