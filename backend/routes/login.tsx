/**
 * Login page.
 *  - password form: plain POST /api/auth/login (works without JS), "Remember me" = 30 days
 *  - After password: gate order fingerprint (if on) → two-step (if on) → enter
 *  - fingerprint login (WebAuthn passkey) button: also offered as passwordless when enabled globally
 *  - step=passkey: post-password fingerprint gate
 *  - step=2fa: Google Authenticator code (POST /api/auth/twofactor)
 * Shell: AuthShell with Vue left illustration (/assets/images/login.svg) on md+.
 */
import { createSignal } from "@dreamer/view";
import { Alert, Button, Checkbox, FormItem, Input, IconFingerprint } from "@dreamer/ui-view";
import type { LoadContext } from "@dreamer/dweb";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { api } from "@common/utils/client-api.ts";
import {
  getAssertionJSON,
  passkeySupported,
} from "@common/utils/webauthn-client.ts";
import { AuthShell } from "@backend/components/AuthShell.tsx";

export async function load(ctx: LoadContext) {
  // Server-only: dynamic import so strip-load drops these from the client chunk.
  const { loginFeatures } = await import("@common/service/security.ts");
  const { peekChallenge, readChallengeToken } = await import(
    "@common/service/challenge.ts"
  );
  const q = new URL(ctx.req.url).searchParams;
  const token = readChallengeToken(ctx.req);
  const hasPasskey = q.get("step") === "passkey" &&
    !!await peekChallenge(token, "passkey-gate");
  const has2fa = q.get("step") === "2fa" &&
    !!await peekChallenge(token, "2fa");
  return {
    failed: q.get("e") === "1",
    captchaFailed: q.get("e") === "captcha",
    step: hasPasskey ? "passkey" : has2fa ? "2fa" : "password",
    locale: resolveLocale(ctx.req),
    passkey: (await loginFeatures()).passkey,
  };
}

const remember = createSignal(false);
const passkeyError = createSignal("");
/** Fingerprint entry visibility: SSR value first, then refreshed from /api/auth/login-options. */
const passkeyOn = createSignal(false);

type Data = {
  failed?: boolean;
  captchaFailed?: boolean;
  step?: string;
  locale?: Locale;
  passkey?: boolean;
};

export default function LoginPage(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  const failed = d.failed ?? false;
  const captchaFailed = d.captchaFailed ?? false;
  const step = d.step ?? "password";
  const locale: Locale = d.locale ?? "zh-CN";
  const tr = createT(locale);
  passkeyOn.value = d.passkey ?? false;
  if (typeof (globalThis as { document?: unknown }).document !== "undefined") {
    void api<{ passkey?: boolean }>("GET", "/api/auth/login-options").then(
      (r) => {
        if (r.ok) passkeyOn.value = !!r.data.passkey;
      },
    );
  }

  async function runPasskey(mode: "login" | "gate") {
    passkeyError.value = "";
    if (!passkeySupported()) {
      passkeyError.value = tr("login.passkeyUnsupported");
      return;
    }
    try {
      const o = await api<{ options: unknown; mode?: string }>(
        "POST",
        "/api/auth/passkey/options",
      );
      if (!o.ok) throw new Error("options");
      const response = await getAssertionJSON(o.data.options);
      const v = await api<{ status?: string }>("POST", "/api/auth/passkey/verify", {
        response,
        remember: remember.value,
      });
      if (!v.ok) throw new Error("verify");
      if (v.data.status === "2fa") {
        (globalThis as { location?: { href: string } }).location!.href =
          "/login?step=2fa";
        return;
      }
      (globalThis as { location?: { href: string } }).location!.href = "/";
    } catch {
      passkeyError.value = mode === "gate"
        ? tr("login.passkeyGateFailed")
        : tr("login.passkeyFailed");
    }
  }

  const title = tr(
    step === "2fa"
      ? "login.twofaTitle"
      : step === "passkey"
      ? "login.passkeyGateTitle"
      : "login.title",
  );
  const subtitle = tr(
    step === "2fa"
      ? "login.twofaHint"
      : step === "passkey"
      ? "login.passkeyGateHint"
      : "login.subtitle",
  );

  const passkeyBlock = (mode: "login" | "gate") => (
    <div data-testid={mode === "gate" ? "passkey-gate-section" : "passkey-section"}>
      {() =>
        passkeyError.value
          ? (
            <Alert
              type="error"
              message={passkeyError.value}
              class="mb-3"
            />
          )
          : null}
      <Button
        type="button"
        class="h-11 w-full"
        variant={mode === "gate" ? "primary" : undefined}
        data-testid={mode === "gate" ? "passkey-gate" : "passkey-login"}
        onClick={() => void runPasskey(mode)}
      >
        <span class="inline-flex items-center justify-center gap-2">
          <IconFingerprint size="md" />
          {tr(mode === "gate" ? "login.passkeyGate" : "login.passkey")}
        </span>
      </Button>
    </div>
  );

  return (
    <AuthShell locale={locale} title={title} subtitle={subtitle} showLeftArt>
      {step === "2fa"
        ? (
          <form method="post" action="/api/auth/twofactor">
            {failed
              ? (
                <Alert
                  type="error"
                  message={tr("login.twofaFailed")}
                  class="mb-4"
                />
              )
              : null}
            <FormItem label={tr("login.twofaCode")}>
              <Input
                name="code"
                type="text"
                {...({ inputMode: "numeric", maxLength: 6 } as Record<
                  string,
                  unknown
                >)}
                autoComplete="one-time-code"
                placeholder="000000"
              />
            </FormItem>
            <Button type="submit" variant="primary" class="mt-6 h-11 w-full">
              {tr("login.twofaSubmit")}
            </Button>
            <a href="/login" class="mt-4 block text-center text-sm">
              {tr("login.back")}
            </a>
          </form>
        )
        : step === "passkey"
        ? (
          <div>
            {failed
              ? (
                <Alert
                  type="error"
                  message={tr("login.passkeyGateFailed")}
                  class="mb-4"
                />
              )
              : null}
            {passkeyBlock("gate")}
            <a href="/login" class="mt-4 block text-center text-sm">
              {tr("login.back")}
            </a>
          </div>
        )
        : (
          <div>
            {/* Gate order on the form: fingerprint first (if on), then password. */}
            {() =>
              passkeyOn.value
                ? (
                  <div class="mb-4">
                    {passkeyBlock("login")}
                    <div class="my-4 flex items-center gap-3 text-xs text-slate-400">
                      <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      {tr("login.or")}
                      <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                )
                : null}
            <form method="post" action="/api/auth/login">
              {captchaFailed
                ? (
                  <Alert
                    type="error"
                    message={tr("login.captchaBad")}
                    class="mb-4"
                  />
                )
                : failed
                ? (
                  <Alert
                    type="error"
                    message={tr("login.failed")}
                    class="mb-4"
                  />
                )
                : null}
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
              <FormItem label={tr("login.captcha")} class="mt-4" required>
                <div class="flex w-full items-center gap-2">
                  <Input
                    name="captcha"
                    class="min-w-0 flex-1"
                    autoComplete="off"
                    placeholder={tr("login.captchaPlaceholder")}
                  />
                  <button
                    type="button"
                    class="adm-captcha-btn shrink-0 cursor-pointer overflow-hidden rounded border border-slate-200 bg-slate-100 p-0 dark:border-slate-600 dark:bg-slate-800"
                    title={tr("login.captchaRefresh")}
                    data-testid="login-captcha"
                    onClick={(e: Event) => {
                      const img = (e.currentTarget as HTMLElement)
                        .querySelector("img");
                      if (img) img.src = `/api/auth/captcha?_t=${Date.now()}`;
                    }}
                  >
                    <img
                      src="/api/auth/captcha"
                      alt={tr("login.captcha")}
                      width="150"
                      height="40"
                      class="adm-captcha-img block h-10 w-37.5"
                    />
                  </button>
                </div>
              </FormItem>
              <div class="mt-4 flex w-full items-center justify-between gap-2">
                <Checkbox name="remember" value="1" checked={remember}>
                  {tr("login.remember")}
                </Checkbox>
                <a
                  href="/password/forget"
                  class="text-sm text-primary-600 hover:underline"
                >
                  {tr("login.forgetLink")}
                </a>
              </div>
              <Button type="submit" variant="primary" class="mt-6 h-11 w-full">
                {tr("login.submit")}
              </Button>
            </form>
          </div>
        )}
    </AuthShell>
  );
}
