/**
 * Fullpage error chrome — centered card aligned across 403/404/500.
 * Used by /error/* routes and framework `_404` / `_500` / `_error`.
 *
 * Includes critical inline CSS so bare dweb `_error` SSR (no App/tailwind
 * injection) still looks centered and polished like the normal page path.
 */
import { Button } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

function codeTone(code: number): { accent: string; codeCls: string } {
  if (code === 403) {
    return {
      accent:
        "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
      codeCls: "text-amber-400/80 dark:text-amber-500/70",
    };
  }
  if (code === 404) {
    return {
      accent:
        "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      codeCls: "text-slate-300 dark:text-slate-600",
    };
  }
  // 500 and other server errors
  return {
    accent: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    codeCls: "text-rose-300 dark:text-rose-500/70",
  };
}

export function ErrorPage(props: {
  locale: Locale;
  code: 403 | 404 | 500 | number;
  title: string;
  message: string;
  /** Prefer home when authenticated chrome is available; login for public. */
  homeHref?: string;
  /** Optional technical detail (e.g. framework `_error` message); muted box. */
  detail?: string;
  /** Show a reload action — useful for 500 / `_error`. */
  showReload?: boolean;
}) {
  const tr = createT(props.locale);
  const href = props.homeHref ?? "/";
  const code = Number(props.code) || 500;
  const tone = codeTone(code);
  const detail = props.detail?.trim();
  return (
    <div
      class="adm-error flex min-h-screen flex-col items-center justify-center gap-0 bg-slate-50 px-4 py-10 text-center dark:bg-slate-950"
      data-testid={`error-${code}`}
      data-error-code={String(code)}
    >
      <style>
        {`
        .adm-error{box-sizing:border-box;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1rem;text-align:center;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
        .adm-error-card{width:100%;max-width:28rem;border-radius:1rem;border:1px solid #e2e8f0;background:#fff;box-shadow:0 20px 40px -24px rgba(15,23,42,.35);padding:2rem 1.75rem}
        .adm-error-badge{display:inline-flex;align-items:center;justify-content:center;width:3.5rem;height:3.5rem;border-radius:9999px;margin:0 auto 0.75rem;font-size:1.25rem;font-weight:700}
        .adm-error-code{margin:0;font-size:4.5rem;line-height:1;font-weight:800;letter-spacing:-0.04em;color:#fda4af}
        .adm-error-title{margin:0.75rem 0 0;font-size:1.5rem;line-height:1.3;font-weight:600;color:#1e293b}
        .adm-error-msg{margin:0.5rem 0 0;font-size:0.875rem;line-height:1.55;color:#64748b;max-width:24rem;margin-left:auto;margin-right:auto}
        .adm-error-detail{margin:1rem 0 0;padding:0.75rem 0.875rem;border-radius:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:0.75rem;line-height:1.45;text-align:center;word-break:break-word;max-height:8rem;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
        .adm-error-actions{margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;align-items:center}
        .adm-error-actions a{text-decoration:none}
        @media (prefers-color-scheme: dark){
          .adm-error{background:#020617;color:#f1f5f9}
          .adm-error-card{background:#0f172a;border-color:#1e293b;box-shadow:0 20px 40px -24px rgba(0,0,0,.6)}
          .adm-error-title{color:#f1f5f9}
          .adm-error-msg{color:#94a3b8}
          .adm-error-detail{background:#020617;border-color:#1e293b;color:#94a3b8}
          .adm-error-code{color:#fb7185}
        }
      `}
      </style>
      <div
        class={`adm-error-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900`}
      >
        <div
          class={`adm-error-badge ${tone.accent}`}
          aria-hidden="true"
        >
          !
        </div>
        <p
          class={`adm-error-code m-0 text-7xl font-extrabold tracking-tight ${tone.codeCls}`}
        >
          {code}
        </p>
        <h1 class="adm-error-title m-0 mt-3 text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {props.title}
        </h1>
        <p class="adm-error-msg m-0 mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {props.message}
        </p>
        {detail
          ? (
            <pre
              class="adm-error-detail text-center"
              data-testid="error-detail"
            >{detail}</pre>
          )
          : null}
        <div class="adm-error-actions mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href={href} class="no-underline">
            <Button type="button" variant="primary">
              {tr("error.backHome")}
            </Button>
          </a>
          {props.showReload
            ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  globalThis.location?.reload();
                }}
              >
                {tr("error.reload")}
              </Button>
            )
            : null}
        </div>
      </div>
    </div>
  );
}
