/**
 * Reset password — Vue fullpage/password/reset.vue (UI stub).
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

export default function ResetPasswordPage(props: { data?: Data }) {
  const locale = props.data?.locale ?? "zh-CN";
  const tr = createT(locale);
  const password = createSignal("");
  const confirm = createSignal("");
  const done = createSignal(false);

  function submit() {
    if (!password.value || !confirm.value) {
      message.error(tr("passwordFlow.required"));
      return;
    }
    if (password.value !== confirm.value) {
      message.error(tr("passwordFlow.mismatch"));
      return;
    }
    if (password.value.length < 6) {
      message.error(tr("passwordFlow.tooShort"));
      return;
    }
    done.value = true;
    message.success(tr("passwordFlow.resetOk"));
  }

  return (
    <AuthShell showLeftArt={false} locale={locale} title={tr("passwordFlow.resetTitle")} subtitle={tr("passwordFlow.resetHint")}>
      {() =>
        done.value
          ? (
            <div class="grid gap-3" data-testid="reset-done">
              <Alert type="success" message={tr("passwordFlow.resetOk")} />
              <a href="/login" class="block text-center text-sm text-primary-600">{tr("passwordFlow.backLogin")}</a>
            </div>
          )
          : (
            <div class="grid gap-3" data-testid="reset-form">
              <FormItem label={tr("passwordFlow.newPassword")} required>
                <Input
                  type="password"
                  value={password}
                  placeholder={tr("passwordFlow.newPasswordPlaceholder")}
                  autoComplete="new-password"
                  onInput={(e: Event) => {
                    password.value = (e.target as unknown as { value: string }).value;
                  }}
                />
              </FormItem>
              <FormItem label={tr("passwordFlow.confirmPassword")} required>
                <Input
                  type="password"
                  value={confirm}
                  placeholder={tr("passwordFlow.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  onInput={(e: Event) => {
                    confirm.value = (e.target as unknown as { value: string }).value;
                  }}
                />
              </FormItem>
              <Button type="button" variant="primary" class="mt-2 h-11 w-full" onClick={submit}>
                {tr("passwordFlow.confirm")}
              </Button>
              <a href="/login" class="mt-1 block text-center text-sm">{tr("passwordFlow.backLogin")}</a>
            </div>
          )}
    </AuthShell>
  );
}
