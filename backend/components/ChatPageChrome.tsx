/**
 * Optional chrome on /chat fill page: back link when opened as same-tab page
 * (mobile), not when opened as named popup (desktop).
 */
import { onMount, createSignal } from "@dreamer/view";
import { IconArrowLeft } from "@dreamer/ui-view";
import { CS_POPUP_NAME } from "@backend/components/cs-open.ts";

export function ChatPageChrome() {
  const showBack = createSignal(false);

  onMount(() => {
    const win = globalThis as unknown as { name?: string };
    // Popup keeps window.name = CS_POPUP_NAME; same-tab /chat (mobile) does not.
    showBack.value = win.name !== CS_POPUP_NAME;
  });

  return (
    <>
      {() =>
        showBack.value
          ? (
            <div
              class="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              data-testid="cs-chat-back-bar"
              style="padding-top: max(0.5rem, env(safe-area-inset-top))"
            >
              <a
                href="/"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
                data-testid="cs-chat-back"
              >
                <IconArrowLeft size="xs" />
                返回管理端
              </a>
            </div>
          )
          : null}
    </>
  );
}
