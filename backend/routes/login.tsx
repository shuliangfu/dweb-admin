/**
 * Login page.
 *  - password form: plain POST /api/auth/login (works without JS), "Remember me" = 30 days
 *  - fingerprint login (WebAuthn passkey) button: rendered only while the backend has
 *    fingerprint login enabled (GET /api/auth/login-options, global switch)
 *  - step=2fa: Google Authenticator code (POST /api/auth/twofactor). Only reachable with a
 *    valid 2FA challenge cookie, i.e. after the password was accepted for an account with 2FA on.
 */
import { createSignal } from "@dreamer/view";
import { Alert, Button, Card, Checkbox, FormItem, IconFingerprint, Input, Stack } from "@dreamer/ui-view";
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { api } from "@common/utils/client-api.ts";
import { getAssertionJSON, passkeySupported } from "@common/utils/webauthn-client.ts";
import { loginFeatures } from "@common/service/security.ts";
import { peekChallenge, readChallengeToken } from "@common/service/challenge.ts";
import { ThemeMenu } from "@backend/components/ThemeMenu.tsx";
import { LangMenu } from "@backend/components/LangMenu.tsx";

export async function load(ctx: LoadContext) {
  const q = new URL(ctx.req.url).searchParams;
  // 2FA prompt only with a live challenge (created after a correct password) — never by URL alone.
  const has2fa = q.get("step") === "2fa" &&
    !!await peekChallenge(readChallengeToken(ctx.req), "2fa");
  return {
    failed: q.get("e") === "1",
    step: has2fa ? "2fa" : "password",
    locale: resolveLocale(ctx.req),
    passkey: (await loginFeatures()).passkey,
  };
}

const remember = createSignal(false);
const passkeyError = createSignal("");
/** Fingerprint entry visibility: SSR value first, then refreshed from /api/auth/login-options. */
const passkeyOn = createSignal(false);

type Data = { failed?: boolean; step?: string; locale?: Locale; passkey?: boolean };

export default function LoginPage(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  const failed = d.failed ?? false;
  const step = d.step ?? "password";
  const locale: Locale = d.locale ?? "zh-CN";
  const tr = createT(locale);
  passkeyOn.value = d.passkey ?? false;
  if (typeof (globalThis as { document?: unknown }).document !== "undefined") {
    void api<{ passkey?: boolean }>("GET", "/api/auth/login-options").then((r) => {
      if (r.ok) passkeyOn.value = !!r.data.passkey;
    });
  }

  async function passkeyLogin() {
    passkeyError.value = "";
    if (!passkeySupported()) {
      passkeyError.value = tr("login.passkeyUnsupported");
      return;
    }
    try {
      const o = await api<{ options: unknown }>("POST", "/api/auth/passkey/options");
      if (!o.ok) throw new Error("options");
      const response = await getAssertionJSON(o.data.options);
      const v = await api("POST", "/api/auth/passkey/verify", { response, remember: remember.value });
      if (!v.ok) throw new Error("verify");
      (globalThis as { location?: { href: string } }).location!.href = "/";
    } catch {
      passkeyError.value = tr("login.passkeyFailed");
    }
  }

  return (
    <div class="flex min-h-screen flex-col">
      <div class="flex items-center justify-end gap-1 p-4">
        <LangMenu locale={locale} />
        <ThemeMenu locale={locale} />
      </div>
      <div class="flex flex-1 items-center justify-center px-4 pb-16">
        <div class="w-full max-w-100">
          <Stack gap={2} align="center" class="mb-8 text-center">
            <span class="inline-block h-12 w-12 rounded-xl bg-primary-600" />
            <h1 class="mt-2 text-xl font-bold">{tr(step === "2fa" ? "login.twofaTitle" : "login.title")}</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {tr(step === "2fa" ? "login.twofaHint" : "login.subtitle")}
            </p>
          </Stack>
          <Card bordered class="shadow-lg">
            {step === "2fa"
              ? (
                <form method="post" action="/api/auth/twofactor">
                  {failed ? <Alert type="error" message={tr("login.twofaFailed")} class="mb-4" /> : null}
                  <FormItem label={tr("login.twofaCode")}>
                    <Input
                      name="code"
                      type="text"
                      {...({ inputMode: "numeric", maxLength: 6 } as Record<string, unknown>)}
                      autoComplete="one-time-code"
                      placeholder="000000"
                    />
                  </FormItem>
                  <Button type="submit" variant="primary" class="mt-6 h-11 w-full">
                    {tr("login.twofaSubmit")}
                  </Button>
                  <a href="/login" class="mt-4 block text-center text-sm">{tr("login.back")}</a>
                </form>
              )
              : (
                <div>
                  <form method="post" action="/api/auth/login">
                    {failed ? <Alert type="error" message={tr("login.failed")} class="mb-4" /> : null}
                    <FormItem label={tr("login.username")}>
                      <Input
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder={tr("login.usernamePlaceholder")}
                      />
                    </FormItem>
                    <FormItem label={tr("login.password")} class="mt-4">
                      <Input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder={tr("login.passwordPlaceholder")}
                      />
                    </FormItem>
                    <div class="mt-4">
                      <Checkbox name="remember" value="1" checked={remember}>
                        {tr("login.remember")}
                      </Checkbox>
                    </div>
                    <Button type="submit" variant="primary" class="mt-6 h-11 w-full">
                      {tr("login.submit")}
                    </Button>
                    <a href="/password/forget" class="mt-3 block text-center text-sm text-primary-600 hover:underline">
                      {tr("login.forgetLink")}
                    </a>
                  </form>
                  {() =>
                    passkeyOn.value
                      ? (
                        <div data-testid="passkey-section">
                          <div class="my-4 flex items-center gap-3 text-xs text-slate-400">
                            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                            {tr("login.or")}
                            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                          </div>
                          {() => passkeyError.value ? <Alert type="error" message={passkeyError.value} class="mb-3" /> : null}
                          <Button type="button" class="h-11 w-full" data-testid="passkey-login" onClick={passkeyLogin}>
                            <span class="inline-flex items-center justify-center gap-2">
                              <IconFingerprint size="md" />
                              {tr("login.passkey")}
                            </span>
                          </Button>
                        </div>
                      )
                      : null}
                </div>
              )}
          </Card>
        </div>
      </div>
    </div>
  );
}
