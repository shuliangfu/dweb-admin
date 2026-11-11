/**
 * Forget password — Vue fullpage/password/forget.vue.
 * Captcha: real GET /api/auth/captcha + verifyCaptcha via /api/auth/captcha/check.
 * Mail delivery: NOT wired (no mail service) — UI success is demo; see docs/handoff.md.
 */
import { createSignal } from "@dreamer/view";
import type { LoadContext } from "@dreamer/dweb";
import { Alert, Button, FormItem, Input, message } from "@dreamer/ui-view";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { AuthShell } from "@backend/components/AuthShell.tsx";
import { api } from "@common/utils/client-api.ts";

export function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

const captchaSrc = createSignal("/api/auth/captcha");

function refreshCaptchaImg() {
  captchaSrc.value = `/api/auth/captcha?_t=${Date.now()}`;
}

export default function ForgetPasswordPage(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  const email = createSignal("");
  const captcha = createSignal("");
  const sent = createSignal(false);
  const busy = createSignal(false);

  async function submit() {
    if (!email.value.trim() || !captcha.value.trim()) {
      message.error(tr("passwordFlow.required"));
      return;
    }
    busy.value = true;
    try {
      const r = await api<{ ok?: boolean }>("POST", "/api/auth/captcha/check", {
        captcha: captcha.value.trim(),
        email: email.value.trim(),
      });
      if (!r.ok) {
        message.error(tr("passwordFlow.captchaBad"));
        captcha.value = "";
        refreshCaptchaImg();
        return;
      }
      // Mail backend absent — Vue forget.vue only console.logs; keep demo toast.
      sent.value = true;
      message.success(tr("passwordFlow.forgetSent"));
    } finally {
      busy.value = false;
    }
  }

  return (
    <AuthShell
      locale={locale}
      title={tr("passwordFlow.forgetTitle")}
      subtitle={tr("passwordFlow.forgetHint")}
    >
      {() =>
        sent.value
          ? (
            <div class="grid gap-3" data-testid="forget-sent">
              <Alert type="success" message={tr("passwordFlow.forgetSent")} />
              <p class="m-0 text-xs text-slate-500 dark:text-slate-400">
                {tr("passwordFlow.mailGap")}
              </p>
              <a
                href="/login"
                class="block text-center text-sm text-primary-600"
              >
                {tr("passwordFlow.backLogin")}
              </a>
            </div>
          )
          : (
            <div class="grid gap-3" data-testid="forget-form">
              <FormItem label={tr("passwordFlow.email")} required>
                <Input
                  type="email"
                  value={email}
                  placeholder={tr("passwordFlow.emailPlaceholder")}
                  onInput={(e: Event) => {
                    email.value =
                      (e.target as unknown as { value: string }).value;
                  }}
                />
              </FormItem>
              <FormItem label={tr("passwordFlow.captcha")} required>
                <div class="flex items-center gap-2">
                  <Input
                    class="min-w-0 flex-1"
                    value={captcha}
                    placeholder={tr("passwordFlow.captchaPlaceholder")}
                    onInput={(e: Event) => {
                      captcha.value =
                        (e.target as unknown as { value: string }).value;
                    }}
                  />
                  <button
                    type="button"
                    class="adm-captcha-btn shrink-0 cursor-pointer overflow-hidden rounded border border-slate-200 bg-slate-100 p-0 dark:border-slate-600 dark:bg-slate-800"
                    title={tr("passwordFlow.captchaRefresh")}
                    data-testid="forget-captcha"
                    onClick={refreshCaptchaImg}
                  >
                    {() => (
                      <img
                        src={captchaSrc.value}
                        alt={tr("passwordFlow.captcha")}
                        width="150"
                        height="40"
                        class="adm-captcha-img block h-10 w-lock-input"
                      />
                    )}
                  </button>
                </div>
              </FormItem>
              <Button
                type="button"
                variant="primary"
                class="mt-2 h-11 w-full"
                loading={busy.value}
                onClick={submit}
              >
                {tr("passwordFlow.sendMail")}
              </Button>
              <a href="/login" class="mt-1 block text-center text-sm">
                {tr("passwordFlow.backLogin")}
              </a>
            </div>
          )}
    </AuthShell>
  );
}
