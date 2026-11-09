/**
 * Admin CS page shell — used by:
 *   - mobile same-tab full page (<768)
 *   - direct /chat URL / e2e (desktop now opens in-app float fill instead of popup)
 * Core UI: shared @common/components/WebChat (messages / input / WS green「已连接」).
 */
import type { LoadContext } from "@dreamer/dweb";
import { WebChat } from "@common/components/WebChat.tsx";
import { ChatPageChrome } from "@backend/components/ChatPageChrome.tsx";
import { PermissionsBootstrap } from "@common/components/PermissionsBootstrap.tsx";
import { can, setMePermissions } from "@common/hook/can.ts";

export async function load(ctx: LoadContext) {
  // Server-only: dynamic import so strip-load drops these from the client chunk.
  const { getCurrentUser } = await import("@common/service/auth.ts");
  const { listPermissionsFromGraph, loadGraph } = await import(
    "@common/service/rbac.ts"
  );
  const user = await getCurrentUser(ctx.req);
  if (!user) {
    return ctx.res
      ? ctx.res.redirect("/login")
      : new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  const grants = listPermissionsFromGraph(await loadGraph(), user.roleCodes);
  return {
    nickname: user.nickname,
    permissions: grants.permissions,
    isSuper: user.isSuper || grants.isSuper,
  };
}

export default function ChatPage(props: {
  data?: { nickname?: string; permissions?: string[]; isSuper?: boolean };
}) {
  const title = `在线客服${props.data?.nickname ? ` · ${props.data.nickname}` : ""}`;
  const perms = props.data?.permissions ?? [];
  const isSuper = !!props.data?.isSuper;
  // Hydrate before can() reads for WebChat props (same render pass).
  setMePermissions({ permissions: perms, isSuper });
  return (
    <div
      class="box-border flex h-[100dvh] w-screen flex-col overflow-hidden bg-white dark:bg-slate-950"
      data-testid="cs-chat-page"
    >
      <PermissionsBootstrap permissions={perms} isSuper={isSuper} />
      <ChatPageChrome />
      <WebChat
        mode="admin"
        title={title}
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
  );
}
