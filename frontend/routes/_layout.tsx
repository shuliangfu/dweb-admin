/**
 * Frontend product shell — full-bleed header / footer + keep-alive CS float
 * marker: FE_LAYOUT_CS_FLOAT_20261107
 */

import type { VNode } from "@dreamer/view";
import { CsSupportFloat } from "@frontend/components/CsSupportFloat.tsx";
import { openCsSupport } from "@frontend/components/cs-support-open.ts";

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

export default function Layout({ children, data }: LayoutProps) {
  const pathname = data?.pathname || "/";
  const isHome = pathname === "/" || pathname === "";
  const isAbout = pathname === "/about" || pathname.startsWith("/about/");

  const headerClass = isHome
    ? "sticky top-0 z-50 border-b border-transparent bg-[#0d1020] text-white"
    : "sticky top-0 z-50 border-b border-[#e8e2d8] bg-[rgba(255,252,248,0.86)] text-[#12101a] backdrop-blur";

  const linkIdle = isHome
    ? "rounded-full px-3.5 py-2 text-sm text-[#e8e4f5] transition-colors hover:bg-white/10"
    : "rounded-full px-3.5 py-2 text-sm text-[#5c5665] transition-colors hover:bg-[#efe8dc] hover:text-[#12101a]";

  const linkActive =
    "rounded-full bg-[#efe8dc] px-3.5 py-2 text-sm font-semibold text-[#12101a]";

  const csClass = isHome
    ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#12101a] shadow-sm transition hover:bg-[#f4f0ea]"
    : "rounded-full bg-[#12101a] px-4 py-2 text-sm font-semibold text-[#fffcf8] shadow-sm transition hover:bg-[#2a2730]";

  return (
    <div class="flex min-h-screen flex-col bg-[#f4f0ea] text-[#12101a] dark:bg-slate-950 dark:text-slate-100">
      <header class={headerClass}>
        <div class="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-10 lg:px-16">
          <a
            href="/"
            class={`flex items-center gap-2.5 text-lg font-bold tracking-tight ${
              isHome ? "text-white" : "text-[#12101a] dark:text-slate-50"
            }`}
          >
            <span
              class={`grid h-7 w-7 place-items-center rounded-lg text-[13px] font-extrabold ${
                isHome
                  ? "bg-white/15 text-white"
                  : "bg-[#12101a] text-[#fffcf8]"
              }`}
            >
              D
            </span>
            Dweb Admin
          </a>
          <ul class="m-0 flex list-none items-center gap-1 p-0 sm:gap-2">
            <li>
              <a href="/" class={linkIdle}>
                首页
              </a>
            </li>
            <li>
              <a href="/about" class={isAbout ? linkActive : linkIdle}>
                关于
              </a>
            </li>
            <li>
              <button
                type="button"
                data-testid="nav-contact-cs"
                class={csClass}
                onClick={() => openCsSupport()}
              >
                在线客服
              </button>
            </li>
          </ul>
        </div>
      </header>

      <main class="flex-1">{children}</main>

      <footer class="border-t border-[#e8e2d8] bg-[#fffcf8] py-9 dark:border-slate-800 dark:bg-slate-900">
        <p class="m-0 px-6 text-center text-[13px] text-[#8a8490] dark:text-slate-400">
          © 2026 Dweb Admin · 基于 @dreamer/dweb 构建
        </p>
      </footer>

      {/* Keep-alive float: sole FE WebChat host */}
      <CsSupportFloat />
    </div>
  );
}
