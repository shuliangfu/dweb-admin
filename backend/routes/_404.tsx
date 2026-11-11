/**
 * Framework 404 — shown when no route matches (dweb `_404.tsx`).
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

/** Fullpage error chrome — do not wrap with route `_layout`. */
export const inheritLayout = false;

export function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

export default function NotFoundPage(props: { data?: Data }) {
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
