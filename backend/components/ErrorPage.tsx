/**
 * Fullpage error chrome — Vue views/error/{403,404,500}.vue (minimal) + back link.
 * Used by /error/* routes and framework `_404` / `_error`.
 */
import { Button } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export function ErrorPage(props: {
  locale: Locale;
  code: 403 | 404 | 500 | number;
  title: string;
  message: string;
  /** Prefer home when authenticated chrome is available; login for public. */
  homeHref?: string;
}) {
  const tr = createT(props.locale);
  const href = props.homeHref ?? "/";
  return (
    <div
      class="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"
      data-testid={`error-${props.code}`}
    >
      <p class="m-0 text-7xl font-bold tracking-tight text-slate-300 dark:text-slate-600">{props.code}</p>
      <h1 class="m-0 text-2xl font-semibold">{props.title}</h1>
      <p class="m-0 max-w-md text-sm text-slate-500 dark:text-slate-400">{props.message}</p>
      <a href={href} class="mt-4 no-underline">
        <Button type="button" variant="primary">{tr("error.backHome")}</Button>
      </a>
    </div>
  );
}
