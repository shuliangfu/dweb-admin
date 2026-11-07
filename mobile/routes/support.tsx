/**
 * Mobile guest customer-service — CsChatApp + apiPublicBase
 */
import { CsChatApp } from "@common/components/CsChatApp.tsx";
import { apiPublicBase } from "@common/utils/cs-ws.ts";

export default function SupportPage() {
  return (
    <div class="box-border">
      <div class="mb-3">
        <h1 class="text-lg font-semibold text-slate-900 dark:text-slate-50">
          联系客服
        </h1>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          访客会话实时同步，无需登录。
        </p>
      </div>
      <div class="mx-auto h-[min(85vh,40rem)] max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CsChatApp mode="guest" apiBase={apiPublicBase()} title="联系客服" />
      </div>
    </div>
  );
}
