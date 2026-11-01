/**
 * App root component (HTML shell). Theme class/anti-flash script is injected by themePlugin.
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
  description = "dweb-admin backend",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <title>{title}</title>
      </head>
      <body class="bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
