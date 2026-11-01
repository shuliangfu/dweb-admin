/**
 * 示例 Console 命令：crond
 *
 * 用法:
 *   dweb-cli run crond/start
 *   dweb-cli run crond/stop
 */

import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "Example crond commands",
  actions: {
    start: { description: "Start example job" },
    stop: { description: "Stop example job" },
  },
};

/**
 * 启动示例任务
 */
export function start(_ctx: ConsoleContext): void {
  console.log("crond start (example)");
}

/**
 * 停止示例任务
 */
export function stop(_ctx: ConsoleContext): void {
  console.log("crond stop (example)");
}
