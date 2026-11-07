/**
 * Frontend guest customer-service — CsChatApp + apiPublicBase
 */
import { CsChatApp } from "@common/components/CsChatApp.tsx";
import { apiPublicBase } from "@common/utils/cs-ws.ts";

export default function SupportPage() {
  return (
    <div class="box-border">
      <div class="mb-4">
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-50">
          联系客服
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          访客会话将实时同步到管理端，无需登录。
        </p>
      </div>
      <div class="mx-auto h-[min(80vh,36rem)] max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CsChatApp mode="guest" apiBase={apiPublicBase()} title="联系客服" />
      </div>
    </div>
  );
}
