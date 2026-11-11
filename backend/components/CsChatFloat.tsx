/**
 * Admin CS in-app shell — ui-view Modal（可拖）; tablet + desktop fill.
 * Open + drag translate persisted in LS (same pattern as FE CsSupportFloat).
 * Title: static「在线客服」＋关钮 only（禁 title／status signal）.
 * 连接状态：仅 Modal 标题旁 DOM patch 绿点／文案（[data-modal-title-status]）；聊天区不插连接系统消息.
 * 拖动：ui-view Modal 只改 transform；onPositionChange 仅松手写 LS.
 * Panel overflow-hidden clips rounded corners.
 * marker: CS_MODAL_DRAG_TRANSFORM_ONLY_20261107 + PANE_FIXED_HEIGHT
 */
import { createSignal, onCleanup, onMount } from "@dreamer/view";
import { Modal } from "@dreamer/ui-view";
import { WebChat } from "@common/components/WebChat.tsx";
import {
  closeCsFloat,
  CS_MOBILE_MAX,
  csFloatIsDesktop,
  csFloatOpen,
  csFloatPos,
  setCsFloatPos,
} from "@backend/components/cs-open.ts";
import { can } from "@common/hook/can.ts";

export function CsChatFloat() {
  const desktop = createSignal(false);

  onMount(() => {
    const win = globalThis as unknown as {
      innerWidth?: number;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    const sync = () => {
      const w = typeof win.innerWidth === "number" ? win.innerWidth : 1280;
      desktop.value = csFloatIsDesktop(w);
      if (!csFloatOpen.value) return;
      if (w <= CS_MOBILE_MAX) closeCsFloat();
    };
    sync();
    if (typeof win.addEventListener !== "function") return;
    win.addEventListener("resize", sync);
    onCleanup(() => win.removeEventListener?.("resize", sync));
  });

  return (
    <Modal
      open={csFloatOpen}
      onClose={() => closeCsFloat()}
      title="在线客服"
      titleAlign="left"
      draggable
      keepInView
      defaultPosition={() => csFloatPos.value}
      onPositionChange={(pos) => setCsFloatPos(pos)}
      mask={false}
      footer={null}
      keyboard
      closable
      centered={false}
      width={() => (desktop.value ? "xl" : "min(92vw, 26rem)")}
      class="!max-h-none overflow-hidden"
      bodyClass="!p-0 overflow-hidden flex min-h-0 flex-col"
      wrapClass="!items-end !justify-end p-4"
    >
      {() => (
        <div
          class={desktop.value
            ? "flex h-[min(85vh,45rem)] max-h-[min(85vh,45rem)] min-h-0 w-full flex-col overflow-hidden"
            : "flex h-[min(72vh,36rem)] max-h-[min(72vh,36rem)] min-h-0 w-full flex-col overflow-hidden"}
          data-testid="cs-chat-float"
          data-cs-shell={desktop.value ? "desktop-fill" : "tablet-float"}
        >
          <WebChat
            mode="admin"
            hideHeader
            class="h-full min-h-0 flex-1 rounded-none border-0 shadow-none"
            showEmoji
            showImage
            showAttachment
            showVoice
            canClaim={can("cs.claim")}
            canHide={can("cs.hide")}
            canRemove={can("cs.remove")}
            canReply={can("cs.reply")}
            canUpload={can("cs.upload")}
            imageMaxSize={5 * 1024 * 1024}
            attachmentMaxSize={20 * 1024 * 1024}
            attachmentAcceptMimes={[
              "application/pdf",
              "application/zip",
              "application/x-zip-compressed",
              "text/plain",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ]}
            attachmentAcceptExts={[
              ".pdf",
              ".zip",
              ".txt",
              ".doc",
              ".docx",
              ".xls",
              ".xlsx",
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
