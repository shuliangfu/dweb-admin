/**
 * FE guest CS shell — ui-view Modal（可拖）wrapping shared WebChat.
 * FAB when closed; Modal when open. Open + drag translate persisted in LS.
 * Title static「在线客服」；连接绿点／文案由 WebChat DOM patch Modal 挂点（禁 title signal）.
 * marker: FE_CS_MODAL_DRAG_POS_20261107 + HIDE_DUP_TITLE + PANE_FIXED_HEIGHT
 */
import { Modal } from "@dreamer/ui-view";
import { WebChat } from "@common/components/WebChat.tsx";
import {
  closeCsSupport,
  csSupportOpen,
  csSupportPos,
  openCsSupport,
  setCsSupportPos,
} from "@frontend/components/cs-support-open.ts";

export function CsSupportFloat() {
  return (
    <>
      {() =>
        !csSupportOpen.value
          ? (
            <button
              type="button"
              data-testid="cs-support-fab"
              aria-label="打开在线客服"
              title="在线客服"
              class="fixed bottom-9 right-9 z-[1200] flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#12101a] text-[#fffcf8] shadow-[0_12px_24px_rgba(18,16,26,0.22)] transition hover:bg-[#2a2730] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a3d] focus-visible:ring-offset-2"
              onClick={() => openCsSupport()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )
          : null}

      <Modal
        open={csSupportOpen}
        onClose={() => closeCsSupport()}
        title="在线客服"
        titleAlign="left"
        draggable
        keepInView
        defaultPosition={() => csSupportPos.value}
        onPositionChange={(pos) => setCsSupportPos(pos)}
        mask={false}
        footer={null}
        keyboard
        closable
        centered={false}
        width="min(94vw, 24.5rem)"
        class="!max-h-none overflow-hidden"
        bodyClass="!p-0 !overflow-hidden flex min-h-0 flex-col"
        wrapClass="!items-end !justify-end p-5"
      >
        {() => (
          <div
            class="flex h-[min(78vh,40rem)] max-h-[min(78vh,40rem)] min-h-0 w-full flex-col overflow-hidden"
            data-testid="cs-support-float"
          >
            <WebChat
              mode="guest"
              apiBase=""
              hideHeader
              class="h-full min-h-0 flex-1 rounded-none border-0 shadow-none"
              showEmoji
              showImage
              showAttachment
              showVoice
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
    </>
  );
}
