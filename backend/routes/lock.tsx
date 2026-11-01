/**
 * Fullpage screen lock — Vue fullpage/lock.vue (clock + avatar + password unlock).
 * Renders without admin chrome; session remains; cookie dweb-admin-locked gates other pages.
 */
import { createSignal, onMount } from "@dreamer/view";
import type { LoadContext } from "@dreamer/dweb";
import { Button, Input } from "@dreamer/ui-view";
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
    setInterval(tick, 1000);
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
    <div class="adm-lock flex min-h-screen flex-col items-center overflow-hidden bg-slate-900 px-4 pt-lock-top text-white">
      <div class="mb-lock-gap text-center" data-testid="lock-clock">
        <div class="text-lg tracking-wide opacity-90">
          {() => `${clock.value.date} ${clock.value.week}`}
        </div>
        <div class="mt-2 font-mono text-6xl md:text-7xl tracking-wider">
          {() => clock.value.time}
        </div>
      </div>
      <div class="flex w-full max-w-sm flex-col items-center gap-3">
        <div
          class="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 text-3xl font-semibold"
          data-testid="lock-avatar"
        >
          {(d.nickname || d.username || "?").slice(0, 1).toUpperCase()}
        </div>
        <div class="text-base font-medium" data-testid="lock-username">{d.username}</div>
        <div class="flex w-full items-stretch gap-2">
          <Input
            type="password"
            class="flex-1"
            value={password}
            placeholder={tr("lock.passwordPlaceholder")}
            onInput={(e: Event) => {
              password.value = (e.target as unknown as { value: string }).value;
              error.value = "";
            }}
            onKeyDown={(e: Event) => {
              if ((e as unknown as { key: string }).key === "Enter") void unlock();
            }}
          />
          <Button
            type="button"
            variant="primary"
            data-testid="lock-unlock"
            onClick={() => void unlock()}
          >
            →
          </Button>
        </div>
        {() => error.value ? <p class="m-0 text-sm text-red-300">{error.value}</p> : null}
      </div>
    </div>
  );
}
