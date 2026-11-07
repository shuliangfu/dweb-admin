/**
 * Framework 500 — unhandled render/load failures (dweb `_500.tsx`).
 * Preferred over legacy `_error` when both exist.
 * dweb passes `{ error: string, stack?: string }` (not always an Error instance).
 */
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ErrorPage } from "@backend/components/ErrorPage.tsx";

/** Fullpage error chrome — do not wrap with route `_layout`. */
export const inheritLayout = false;

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

export default function Framework500Page(props: {
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
    <div data-dweb-special="_500" data-testid="framework-special-500">
      <ErrorPage
        locale={locale}
        code={code}
        title={tr("error.page500Title")}
        message={tr("error.page500Message")}
        detail={detail}
        showReload
        homeHref="/"
      />
    </div>
  );
}
