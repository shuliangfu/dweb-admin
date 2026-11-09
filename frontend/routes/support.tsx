/**
 * FE /support deep-link — opens keep-alive float (sole WebChat in layout).
 * Page itself is a soft landing; chat UI lives in CsSupportFloat → WebChat.
 * marker: FE_SUPPORT_DEEP_LINK_FLOAT_20261107
 */
import { onMount } from "@dreamer/view";
import { Button } from "@dreamer/ui-view";
import { openCsSupport } from "@frontend/components/cs-support-open.ts";

export default function SupportPage() {
  onMount(() => {
    openCsSupport();
  });

  return (
    <div class="mx-auto max-w-lg">
      <div class="overflow-hidden rounded-[20px] border border-indigo-100 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-900">
        <div class="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-6 py-8 text-white">
          <p class="m-0 text-xs font-semibold uppercase tracking-widest text-indigo-100">
            Support
          </p>
          <h1 class="mb-2 mt-2 text-2xl font-bold tracking-tight">
            在线客服已在右下角打开
          </h1>
          <p class="m-0 text-sm leading-relaxed text-indigo-100">
            浮窗会话切页保活，无需登录；消息实时同步到管理端接待窗。
          </p>
        </div>
        <div class="space-y-4 px-6 py-6">
          <ul class="m-0 list-none space-y-2 p-0 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li class="flex gap-2">
              <span class="text-indigo-500" aria-hidden="true">✓</span>
              <span>共用组件 <code class="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">WebChat</code>，与手机端同一聊天核心</span>
            </li>
            <li class="flex gap-2">
              <span class="text-indigo-500" aria-hidden="true">✓</span>
              <span>无硬遮罩：浏览页面时仍可操作背后内容</span>
            </li>
            <li class="flex gap-2">
              <span class="text-indigo-500" aria-hidden="true">✓</span>
              <span>关闭后可用右下角按钮再次打开</span>
            </li>
          </ul>
          <Button
            type="button"
            variant="primary"
            data-testid="contact-cs"
            onClick={() => openCsSupport()}
          >
            重新打开在线客服浮窗
          </Button>
        </div>
      </div>
    </div>
  );
}
