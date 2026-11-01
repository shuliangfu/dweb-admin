/**
 * Forget password — Vue fullpage/password/forget.vue (UI stub; no mail backend yet).
 */
import { createSignal } from "@dreamer/view";
import type { LoadContext } from "@dreamer/dweb";
import { Alert, Button, FormItem, Input, message } from "@dreamer/ui-view";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { AuthShell } from "@backend/components/AuthShell.tsx";

export async function load(ctx: LoadContext) {
  return { locale: resolveLocale(ctx.req) };
}

type Data = { locale?: Locale };

export default function ForgetPasswordPage(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  const email = createSignal("");
  const captcha = createSignal("");
  const captchaHint = createSignal(String(Math.floor(10 + Math.random() * 89)));
  const sent = createSignal(false);

  function refreshCaptcha() {
    captchaHint.value = String(Math.floor(10 + Math.random() * 89));
    captcha.value = "";
  }

  function submit() {
    if (!email.value.trim() || !captcha.value.trim()) {
      message.error(tr("passwordFlow.required"));
      return;
    }
    if (captcha.value.trim() !== captchaHint.value) {
      message.error(tr("passwordFlow.captchaBad"));
      refreshCaptcha();
      return;
    }
    // Vue forget.vue only console.logs — keep minimal until mail service lands.
    sent.value = true;
    message.success(tr("passwordFlow.forgetSent"));
  }

  return (
    <AuthShell locale={locale} title={tr("passwordFlow.forgetTitle")} subtitle={tr("passwordFlow.forgetHint")}>
      {() =>
        sent.value
          ? (
            <div class="grid gap-3" data-testid="forget-sent">
              <Alert type="success" message={tr("passwordFlow.forgetSent")} />
              <a href="/login" class="block text-center text-sm text-primary-600">{tr("passwordFlow.backLogin")}</a>
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
                    email.value = (e.target as unknown as { value: string }).value;
                  }}
                />
              </FormItem>
              <FormItem label={tr("passwordFlow.captcha")} required>
                <div class="flex items-center gap-2">
                  <Input
                    class="flex-1"
                    value={captcha}
                    placeholder={tr("passwordFlow.captchaPlaceholder")}
                    onInput={(e: Event) => {
                      captcha.value = (e.target as unknown as { value: string }).value;
                    }}
                  />
                  <button
                    type="button"
                    class="flex h-9 w-22 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 font-mono text-lg tracking-widest dark:border-slate-600 dark:bg-slate-700"
                    title={tr("passwordFlow.captchaRefresh")}
                    data-testid="forget-captcha"
                    onClick={refreshCaptcha}
                  >
                    {() => captchaHint.value}
                  </button>
                </div>
              </FormItem>
              <Button type="button" variant="primary" class="mt-2 h-11 w-full" onClick={submit}>
                {tr("passwordFlow.sendMail")}
              </Button>
              <a href="/login" class="mt-1 block text-center text-sm">{tr("passwordFlow.backLogin")}</a>
            </div>
          )}
    </AuthShell>
  );
}
