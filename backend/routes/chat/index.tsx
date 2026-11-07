/**
 * Admin customer-service chat — opened in a new window from the top-header icon.
 * Requires login (rbac auth-only `/chat`).
 */
import type { LoadContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { CsChatApp } from "@common/components/CsChatApp.tsx";

export async function load(ctx: LoadContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) {
    return ctx.res
      ? ctx.res.redirect("/login")
      : new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { nickname: user.nickname };
}

export default function ChatPage(props: { data?: { nickname?: string } }) {
  return (
    <div class="box-border min-h-screen bg-slate-100 p-4 dark:bg-slate-950">
      <div class="mx-auto h-[calc(100vh-2rem)] max-w-5xl">
        <CsChatApp
          mode="admin"
          title={`在线客服${props.data?.nickname ? ` · ${props.data.nickname}` : ""}`}
        />
      </div>
    </div>
  );
}
