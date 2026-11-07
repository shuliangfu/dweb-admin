/**
 * Mobile app root — document shell
 */

import type { VNode } from "@dreamer/view";

interface AppProps {
  children?: VNode | VNode[];
  title?: string;
  description?: string;
}

export default function App({
  children,
  title = "Dweb Admin · 手机",
  description = "Dweb Admin 手机端门户与客服入口",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <title>{title}</title>
      </head>
      <body class="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
