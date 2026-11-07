/**
 * Frontend product shell — header / nav / footer + keep-alive CS float
 * marker: FE_LAYOUT_CS_FLOAT_20261107
 */

import type { VNode } from "@dreamer/view";
import { CsSupportFloat } from "@frontend/components/CsSupportFloat.tsx";
import { openCsSupport } from "@frontend/components/cs-support-open.ts";

interface LayoutProps {
  children?: VNode | VNode[];
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            class="text-lg font-semibold tracking-tight text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Dweb Admin
          </a>
          <ul class="flex items-center gap-1 list-none m-0 p-0 sm:gap-2">
            <li>
              <a
                href="/"
                class="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                首页
              </a>
            </li>
            <li>
              <a
                href="/about"
                class="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                关于
              </a>
            </li>
            <li>
              <button
                type="button"
                data-testid="nav-contact-cs"
                class="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                onClick={() => openCsSupport()}
              >
                在线客服
              </button>
            </li>
          </ul>
        </div>
      </header>

      <main class="flex-1">
        <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer class="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            © 2026 Dweb Admin · 基于 @dreamer/dweb 构建
          </p>
        </div>
      </footer>

      {/* Keep-alive float: sole FE WebChat host */}
      <CsSupportFloat />
    </div>
  );
}
