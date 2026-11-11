/**
 * Mobile native-app shell — immersive pages + floating inset bottom tabs
 */

import type { VNode } from "@dreamer/view";

interface LayoutData {
  pathname?: string;
}

interface LayoutProps {
  children?: VNode | VNode[];
  data?: LayoutData;
}

export function load(ctx: { pathname?: string }) {
  return { pathname: ctx.pathname || "/" };
}

function tabClass(active: boolean): string {
  return [
    "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors",
    active ? "text-[#12101a]" : "text-[#8a8490]",
  ].join(" ");
}

function IconHome({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={`h-5 w-5 ${active ? "" : "opacity-90"}`}
      aria-hidden="true"
    >
      <path d="M4 10.5 12 3.5l8 7" />
      <path d="M6.5 9.5V20h11V9.5" />
    </svg>
  );
}

function IconInfo({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={`h-5 w-5 ${active ? "" : "opacity-90"}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function IconChat({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={`h-5 w-5 ${active ? "" : "opacity-90"}`}
      aria-hidden="true"
    >
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V6.5z" />
    </svg>
  );
}

export default function Layout({ children, data }: LayoutProps) {
  const pathname = data?.pathname || "/";
  const isSupport = pathname === "/support" || pathname.startsWith("/support/");
  const homeActive = pathname === "/" || pathname === "";
  const aboutActive = pathname === "/about" || pathname.startsWith("/about/");
  const supportActive = isSupport;

  return (
    <div class="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#f4f0ea] text-[#12101a] dark:bg-slate-950 dark:text-slate-100">
      <main
        class={`flex min-h-0 flex-1 flex-col ${
          isSupport ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {isSupport
          ? children
          : (
            <div class="mx-auto w-full max-w-lg flex-1 pb-24">
              {children}
            </div>
          )}
      </main>

      <nav
        class="absolute bottom-3 left-3 right-3 z-40 flex h-16 items-stretch rounded-[22px] border border-[#e8e2d8] bg-[rgba(255,252,248,0.94)] shadow-[0_10px_30px_rgba(18,16,26,0.1)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        style="padding-bottom: env(safe-area-inset-bottom)"
        aria-label="底部导航"
      >
        <ul class="m-0 flex w-full list-none items-stretch p-0">
          <li class="flex flex-1">
            <a
              href="/"
              class={tabClass(homeActive)}
              aria-current={homeActive ? "page" : undefined}
            >
              <IconHome active={homeActive} />
              <span>首页</span>
            </a>
          </li>
          <li class="flex flex-1">
            <a
              href="/about"
              class={tabClass(aboutActive)}
              aria-current={aboutActive ? "page" : undefined}
            >
              <IconInfo active={aboutActive} />
              <span>关于</span>
            </a>
          </li>
          <li class="flex flex-1">
            <a
              href="/support"
              data-testid="nav-contact-cs"
              class={tabClass(supportActive)}
              aria-current={supportActive ? "page" : undefined}
            >
              <IconChat active={supportActive} />
              <span>在线客服</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
