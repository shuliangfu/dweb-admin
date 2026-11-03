/**
 * Fullpage screen lock — Vue fullpage/lock.vue (clock + avatar + password unlock).
 * Renders without admin chrome; session remains; cookie dweb-admin-locked gates other pages.
 */
import { createSignal, onCleanup, onMount } from "@dreamer/view";
import type { LoadContext } from "@dreamer/dweb";
import {
  Button,
  Input,
} from "@dreamer/ui-view";
import { IconArrowRight } from "@dreamer/ui-view/icons/ArrowRight.tsx";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { api } from "@common/utils/client-api.ts";
import { clearLockCookieClient, isLockedRequest } from "@backend/components/lock-kit.ts";

interface Data {
  locale?: Locale;
  nickname?: string;
  username?: string;
}

export async function load(ctx: LoadContext): Promise<Data | Response> {
  const locale = resolveLocale(ctx.req);
  const { getCurrentUser } = await import("@common/service/auth.ts");
  const user = await getCurrentUser(ctx.req);
  if (!user) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  // Ensure lock cookie is set when visiting /lock directly after menu action.
  if (!isLockedRequest(ctx.req.headers.get("cookie"))) {
    // Still show the page; client may have just navigated with cookie pending.
  }
  return {
    locale,
    nickname: user.nickname,
    username: user.username,
  };
}

const WEEK_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEK_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function LockPage(props: { data?: Data }) {
  const d = props.data ?? {};
  const locale = d.locale ?? "zh-CN";
  const tr = createT(locale);
  const password = createSignal("");
  const error = createSignal("");
  const busy = createSignal(false);
  const clock = createSignal({ date: "", week: "", time: "" });
  /** Vue lock.vue: unlock circle appears once password length >= 6. */
  const canUnlock = createSignal(false);

  onMount(() => {
    const tick = () => {
      const now = new Date();
      const week = (locale === "zh-CN" ? WEEK_ZH : WEEK_EN)[now.getDay()];
      clock.value = {
        date: `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`,
        week,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      };
    };
    tick();
    const id = setInterval(tick, 1000);
    onCleanup(() => clearInterval(id));
  });

  async function unlock() {
    if (busy.value) return;
    error.value = "";
    if (!password.value) {
      error.value = tr("lock.passwordRequired");
      return;
    }
    busy.value = true;
    const r = await api("POST", "/api/auth/unlock", { password: password.value });
    busy.value = false;
    if (!r.ok) {
      error.value = tr("lock.failed");
      return;
    }
    clearLockCookieClient();
    (globalThis as { location?: { href: string } }).location!.href = "/";
  }

  return (
    <div class="adm-lock flex min-h-screen flex-col items-center overflow-hidden px-4 pt-lock-top text-white">
      <div class="mb-lock-gap text-center" data-testid="lock-clock">
        <div class="adm-lock-date text-xl tracking-wide opacity-90">
          {() => `${clock.value.date} ${clock.value.week}`}
        </div>
        <div class="adm-lock-time mt-2.5 text-lock-clock tracking-wider">
          {() => clock.value.time}
        </div>
      </div>
      <div class="flex w-full max-w-sm flex-col items-center gap-3">
        <div
          class="flex h-36 w-36 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 text-4xl font-semibold"
          data-testid="lock-avatar"
        >
          {(d.nickname || d.username || "?").slice(0, 1).toUpperCase()}
        </div>
        <div class="mb-3 text-xl font-medium" data-testid="lock-username">{d.username}</div>
        <div class="adm-lock-input relative flex w-lock-input items-center">
          <Input
            type="password"
            class="w-full"
            value={password}
            placeholder={tr("lock.passwordPlaceholder")}
            onInput={(e: Event) => {
              const v = (e.target as unknown as { value: string }).value;
              password.value = v;
              canUnlock.value = v.length >= 6;
              error.value = "";
            }}
            onKeyDown={(e: Event) => {
              if ((e as unknown as { key: string }).key === "Enter" && canUnlock.value) void unlock();
            }}
          />
          {() =>
            canUnlock.value
              ? (
                <Button
                  type="button"
                  variant="primary"
                  class="adm-lock-unlock"
                  data-testid="lock-unlock"
                  disabled={busy.value}
                  onClick={() => void unlock()}
                >
                  <IconArrowRight size="xs" />
                </Button>
              )
              : null}
        </div>
        {() => error.value ? <p class="m-0 text-sm text-red-300">{error.value}</p> : null}
      </div>
    </div>
  );
}
