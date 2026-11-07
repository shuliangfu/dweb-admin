/**
 * Mobile product shell — compact header / nav / footer
 */

import type { VNode } from "@dreamer/view";

interface LayoutProps {
  children?: VNode | VNode[];
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div class="mx-auto flex h-12 max-w-lg items-center justify-between px-3">
          <a
            href="/"
            class="truncate text-base font-semibold tracking-tight text-indigo-600 dark:text-indigo-400"
          >
            Dweb Admin · 手机
          </a>
          <ul class="flex items-center gap-0.5 list-none m-0 p-0">
            <li>
              <a
                href="/"
                class="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                首页
              </a>
            </li>
            <li>
              <a
                href="/about"
                class="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                关于
              </a>
            </li>
            <li>
              <a
                href="/support"
                data-testid="nav-contact-cs"
                class="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                客服
              </a>
            </li>
          </ul>
        </div>
      </header>

      <main class="flex-1">
        <div class="mx-auto max-w-lg px-3 py-5">{children}</div>
      </main>

      <footer class="border-t border-slate-200 bg-white py-5 dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto max-w-lg px-3 text-center">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            © 2026 Dweb Admin · 手机端
          </p>
        </div>
      </footer>
    </div>
  );
}
