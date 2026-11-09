/**
 * Mobile guest CS — full-screen App page wrapping shared WebChat.
 * Not modal / float; bottom Tab stays from layout.
 * marker: MOBILE_SUPPORT_APP_SHELL_20261107 + PANE_FIXED_HEIGHT
 */
import { WebChat } from "@common/components/WebChat.tsx";

export default function SupportPage() {
  return (
    <div
      class="flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#f4f0ea] pb-[76px] dark:bg-slate-900"
      data-testid="mobile-support-shell"
      style="padding-top: env(safe-area-inset-top)"
    >
      <WebChat
        mode="guest"
        apiBase=""
        title="在线客服"
        class="h-full min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none"
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
  );
}
