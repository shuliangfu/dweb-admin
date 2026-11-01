/**
 * 首页
 * 路由: /
 */

import { Button } from "@common/components/Button.tsx";

import { createSignal } from "@dreamer/view";

export default function Home() {

  const count = createSignal(0);
  return (
    <div class="py-5">
      <section class="mb-10 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-5 py-15 text-center text-white">
        <h1 class="mb-4 text-4xl">欢迎使用 Dweb 框架</h1>
        <p class="text-xl text-white/90">
          这是一个使用 @dreamer/dweb 框架构建的 View 示例项目
        </p>
      </section>

      <section class="mb-10">
        <h2 class="mb-8 text-center text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-linear-to-r from-[#667eea] to-[#764ba2]">特性</h2>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">View</h3>
            <p>轻量级 React 替代方案</p>
          </div>
        </div>
      </section>

      <section class="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 class="mb-4 text-center text-[#667eea]">计数器示例</h2>
        <p class="mb-4 text-center text-sm text-gray-500">View 细粒度渲染：仅此块随 count 更新</p>
        {() => (
          <div class="flex flex-col items-center justify-center gap-4">
            <span class="text-2xl font-semibold">count: {count}</span>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  count.value = count.value + 1;
                }}
              >
                加一
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  count.value = count.value - 1;
                }}
              >
                减一
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  count.value = 0;
                }}
              >
                重置
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
