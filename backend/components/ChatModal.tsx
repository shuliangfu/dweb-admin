/**
 * Minimal chat shell — Vue ChatModal entry without IM backend.
 * Opens from TopHeader; shows placeholder until a real chat service exists.
 */
import { createSignal } from "@dreamer/view";
import { Modal } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const chatOpen = createSignal(false);

export function ChatModal(props: { locale: Locale }) {
  const tr = createT(props.locale);
  return (
    <Modal
      open={chatOpen}
      title={tr("shell.chatTitle")}
      width="lg"
      keyboard
      destroyOnClose
      onClose={() => {
        chatOpen.value = false;
      }}
    >
      <div class="flex min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-center text-slate-500 dark:text-slate-400" data-testid="chat-placeholder">
        <p class="m-0 text-sm">{tr("shell.chatEmpty")}</p>
      </div>
    </Modal>
  );
}
