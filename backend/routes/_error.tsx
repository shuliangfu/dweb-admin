/**
 * Framework error page — unhandled render/load failures (dweb `_error.tsx`).
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

export async function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale; error?: Error; statusCode?: number };

export default function FrameworkErrorPage(props: { data?: Data; error?: Error; statusCode?: number }) {
  const d = props.data ?? {};
  const locale = d.locale ?? "zh-CN";
  const tr = createT(locale);
  const code = props.statusCode ?? d.statusCode ?? 500;
  const detail = props.error?.message ?? d.error?.message;
  return (
    <ErrorPage
      locale={locale}
      code={code}
      title={tr("error.page500Title")}
      message={detail || tr("error.page500Message")}
      homeHref="/"
    />
  );
}
