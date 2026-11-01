/**
 * Chat shell aligned to Vue ChatModal / Chat.vue IA (search + list | detail).
 * No IM backend in dweb-admin — panes stay empty with an honest note (not fake threads).
 */
import { createSignal } from "@dreamer/view";
import { Input, Modal } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const chatOpen = createSignal(false);
const filterText = createSignal("");

export function ChatModal(props: { locale: Locale }) {
  const tr = createT(props.locale);

  return (
    <Modal
      open={chatOpen}
      title={tr("shell.chatTitle")}
      width="xl"
      keyboard
      destroyOnClose
      onClose={() => {
        chatOpen.value = false;
        filterText.value = "";
      }}
    >
      <div class="flex min-h-90 flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700" data-testid="chat-shell">
        <div class="flex items-stretch border-b border-slate-200 dark:border-slate-700">
          <div class="flex w-chat-pane min-w-40 items-center gap-2 border-r border-slate-200 px-3 py-2 dark:border-slate-700">
            <Input
              value={filterText}
              placeholder={tr("shell.chatSearch")}
              class="w-full"
              onInput={(e: Event) => {
                filterText.value = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <div class="flex min-w-0 flex-1 items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {tr("shell.chatDetailTitle")}
          </div>
        </div>
        <div class="flex min-h-0 flex-1">
          <aside class="flex w-chat-pane min-w-40 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
            <div class="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <p class="m-0">{tr("shell.chatListEmpty")}</p>
              {() =>
                filterText.value.trim()
                  ? <p class="m-0 opacity-70">{tr("shell.chatFilterHint", { q: filterText.value.trim() })}</p>
                  : null}
            </div>
          </aside>
          <section class="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-white p-6 text-center dark:bg-slate-800">
            <p class="m-0 text-sm text-slate-500 dark:text-slate-400">{tr("shell.chatEmpty")}</p>
            <p class="m-0 text-xs text-slate-400 dark:text-slate-500">{tr("shell.chatBackendNote")}</p>
          </section>
        </div>
      </div>
    </Modal>
  );
}
