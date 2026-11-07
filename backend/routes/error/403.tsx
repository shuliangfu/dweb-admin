/**
 * Explicit /error/403 — Vue error/403.vue path parity.
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

export function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

export default function Error403Page(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  return (
    <ErrorPage
      locale={locale}
      code={403}
      title={tr("error.page403Title")}
      message={tr("error.page403Message")}
      homeHref="/"
    />
  );
}
