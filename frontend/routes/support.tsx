/**
 * FE /support deep-link — opens keep-alive float (sole WebChat in layout).
 * Page itself is a soft landing; chat UI lives in CsSupportFloat → WebChat.
 * marker: FE_SUPPORT_DEEP_LINK_FLOAT_20261107
 */
import { onMount } from "@dreamer/view";
import { openCsSupport } from "@frontend/components/cs-support-open.ts";

export default function SupportPage() {
  onMount(() => {
    openCsSupport();
  });

  return (
    <div class="min-h-[calc(100vh-72px-88px)]">
      <div class="mx-auto grid max-w-[1440px] items-start gap-12 px-6 py-14 sm:px-10 lg:grid-cols-[1fr_420px] lg:px-16 lg:pb-20 lg:pt-14">
        <div>
          <p class="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a3d]">
            Support
          </p>
          <h1 class="mb-4 text-4xl font-bold leading-[1.15] tracking-tight text-[#12101a] dark:text-slate-50 sm:text-5xl">
            在线客服已在右下角打开
          </h1>
          <p class="m-0 max-w-[520px] text-[17px] leading-[1.75] text-[#6b6570] dark:text-slate-300">
            浮窗会话切页保活，无需登录；消息实时同步到管理端接待窗。你可以继续浏览页面，不必被遮罩打断。
          </p>
          <div class="my-7 flex flex-col gap-3">
            {[
              "共用组件 WebChat，与手机端同一聊天核心",
              "无硬遮罩：浏览页面时仍可操作背后内容",
              "关闭后可用右下角按钮再次打开",
            ].map((text) => (
              <div class="flex items-start gap-3 text-[15px] leading-[1.6] text-[#3f3a45] dark:text-slate-300">
                <span class="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#12101a] text-xs text-[#fffcf8]">
                  ✓
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid="contact-cs"
            class="inline-flex h-12 w-[220px] items-center justify-center rounded-[14px] bg-[#12101a] px-5 text-[15px] font-semibold text-[#fffcf8] transition hover:bg-[#2a2730]"
            onClick={() => openCsSupport()}
          >
            重新打开在线客服浮窗
          </button>
        </div>

        {/* Decorative chat preview only — real float is CsSupportFloat */}
        <div
          class="hidden h-[520px] flex-col overflow-hidden rounded-[24px] border border-[#e8e2d8] bg-[#fffcf8] shadow-[0_10px_30px_rgba(18,16,26,0.03)] lg:flex dark:border-slate-700 dark:bg-slate-900"
          aria-hidden="true"
        >
          <div class="flex items-center gap-3 border-b border-[#e8e2d8] bg-[#f4f0ea] px-[18px] py-4">
            <div class="grid h-9 w-9 place-items-center rounded-full bg-[#12101a] text-sm font-extrabold text-[#fffcf8]">
              客
            </div>
            <div>
              <div class="font-bold text-[#12101a]">在线客服</div>
              <div class="text-[11px] text-[#6b6570]">通常即时回复</div>
            </div>
          </div>
          <div class="mx-4 mt-2.5 max-w-[78%] rounded-2xl rounded-bl-sm bg-[#f3efe8] px-3.5 py-2.5 text-[13px] leading-[1.55] text-[#2a2730]">
            你好，我是 Dweb Admin 在线客服，可以介绍产品能力或协助接入。
          </div>
          <div class="ml-auto mr-4 mt-2.5 max-w-[78%] rounded-2xl rounded-br-sm bg-[#12101a] px-3.5 py-2.5 text-[13px] leading-[1.55] text-[#fffcf8]">
            想了解权限和多端是怎么配合的。
          </div>
          <div class="mx-4 mt-2.5 max-w-[78%] rounded-2xl rounded-bl-sm bg-[#f3efe8] px-3.5 py-2.5 text-[13px] leading-[1.55] text-[#2a2730]">
            管理在后台，介绍与咨询在 Web／手机端，消息会实时进接待窗，访客不用登录。
          </div>
          <div class="mt-auto border-t border-[#eee8de] px-4 py-3 text-[13px] text-[#9b97ab] dark:border-slate-700">
            输入消息…
          </div>
        </div>
      </div>
    </div>
  );
}
