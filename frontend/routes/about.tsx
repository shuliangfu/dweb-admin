/**
 * 关于页面
 * 路由: /about
 */

export default function About() {
  return (
    <div class="py-5">
      <h1 class="mb-8 text-3xl font-bold">关于我们</h1>

      <section class="rounded-lg bg-white p-8 shadow-md">
        <p class="mb-6" dangerouslySetInnerHTML={{ __html: "这是一个使用 <strong>@dreamer/dweb</strong> 框架和 <strong>View</strong> 构建的示例项目。" }} />

        <h2 class="mb-4 mt-6 text-xl font-semibold text-indigo-600">技术栈</h2>
        <ul class="ml-5 list-disc space-y-2">
          <li>
            <strong>@dreamer/dweb</strong> - 全栈 Web 框架
          </li>
          <li>
            <strong>View</strong> - 轻量级 React 替代方案
          </li>
          <li>
            <strong>Deno</strong> - 现代 JavaScript/TypeScript 运行时
          </li>
          <li>
            <strong>TypeScript</strong> - 类型安全的 JavaScript
          </li>
        </ul>
      </section>
    </div>
  );
}
