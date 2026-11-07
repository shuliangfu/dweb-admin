/**
 * Framework error page — unhandled render/load failures (dweb `_error.tsx`).
 * dweb passes `{ error: string, stack?: string }` (not always an Error instance).
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

export async function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale; error?: Error | string; statusCode?: number };

function errorDetail(err: unknown): string | undefined {
  if (err == null || err === "") return undefined;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || undefined;
  try {
    return String(err);
  } catch {
    return undefined;
  }
}

export default function FrameworkErrorPage(props: {
  data?: Data;
  error?: Error | string;
  stack?: string;
  statusCode?: number;
}) {
  const d = props.data ?? {};
  const locale = d.locale ?? "zh-CN";
  const tr = createT(locale);
  const code = props.statusCode ?? d.statusCode ?? 500;
  const detail = errorDetail(props.error) ?? errorDetail(d.error);
  return (
    <ErrorPage
      locale={locale}
      code={code}
      title={tr("error.page500Title")}
      message={tr("error.page500Message")}
      detail={detail}
      showReload
      homeHref="/"
    />
  );
}
