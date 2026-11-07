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
  title = "Dweb Admin",
  description = "Dweb Admin 手机应用",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1"
        />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <title>{title}</title>
      </head>
      <body class="m-0 bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
