/**
 * Chat shell aligned to Vue ChatModal / Chat.vue / ChatDetail IA:
 *   search strip | conversation title
 *   ConversationList (≈3) | message list + input panel (≈7)
 * No IM backend in dweb-admin — panes stay empty with an honest note (not fake threads).
 */
import { createSignal } from "@dreamer/view";
import {
  Button,
  Input,
  Modal,
} from "@dreamer/ui-view";
import { IconImage } from "@dreamer/ui-view/icons/Image.tsx";
import { IconMessageSquare } from "@dreamer/ui-view/icons/MessageSquare.tsx";
import { IconSend } from "@dreamer/ui-view/icons/Send.tsx";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const chatOpen = createSignal(false);
const filterText = createSignal("");
const draft = createSignal("");

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
        draft.value = "";
      }}
    >
      <div
        class="flex min-h-90 flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700"
        data-testid="chat-shell"
      >
        <div class="flex items-stretch border-b border-slate-200 dark:border-slate-700">
          <div class="flex w-chat-pane min-w-40 items-center gap-2 border-r border-slate-200 px-3 py-2 dark:border-slate-700">
            <Input
              value={filterText}
              placeholder={tr("shell.chatSearch")}
              class="w-full"
              onInput={(e: Event) => {
                filterText.value = (e.target as unknown as { value: string }).value;
              }}
            />
          </div>
          <div class="flex min-w-0 flex-1 items-center gap-2 px-5 py-2.5 text-lg font-medium text-slate-700 dark:text-slate-200">
            <IconMessageSquare size="sm" class="opacity-70" />
            {tr("shell.chatDetailTitle")}
          </div>
        </div>

        <div class="flex min-h-0 flex-1">
          <aside class="flex w-chat-pane min-w-40 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
            <div class="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <IconMessageSquare size="lg" class="opacity-40" />
              <p class="m-0">{tr("shell.chatListEmpty")}</p>
              {() =>
                filterText.value.trim()
                  ? (
                    <p class="m-0 opacity-70">
                      {tr("shell.chatFilterHint", { q: filterText.value.trim() })}
                    </p>
                  )
                  : null}
            </div>
          </aside>

          <section class="flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-800">
            <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <IconMessageSquare size="lg" class="opacity-30" />
              <p class="m-0 text-sm text-slate-500 dark:text-slate-400">{tr("shell.chatEmpty")}</p>
              <p class="m-0 text-xs text-slate-400 dark:text-slate-500">{tr("shell.chatBackendNote")}</p>
            </div>
            <div
              class="flex shrink-0 flex-col gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40"
              data-testid="chat-input-panel"
            >
              <div class="flex items-center gap-1" data-testid="chat-tools">
                <Button type="button" size="sm" disabled aria-label="image">
                  <IconImage size="sm" />
                </Button>
                <span class="ml-1 text-xs text-slate-400 dark:text-slate-500">{tr("shell.chatToolsHint")}</span>
              </div>
              <div class="flex items-end gap-2">
                <Input
                  value={draft}
                  placeholder={tr("shell.chatComposePlaceholder")}
                  class="min-w-0 flex-1"
                  disabled
                  onInput={(e: Event) => {
                    draft.value = (e.target as unknown as { value: string }).value;
                  }}
                />
                <Button type="button" variant="primary" size="sm" disabled>
                  <IconSend size="sm" />
                  <span class="ml-1">{tr("shell.chatSend")}</span>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
