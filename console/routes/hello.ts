/**
 * 示例 Console 命令：hello
 *
 * 用法:
 *   dweb-cli run hello/world Ada
 *   dweb-cli run hello/world --name Ada
 * 位置参数在 ctx.args，--name 这类选项在 ctx.options。
 * 框架选项：-a/--app、-l/--list、--timeout。
 */

import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "Hello console commands",
  actions: {
    world: { description: "Print a greeting" },
  },
};

/**
 * 示例命令：打印问候
 */
export function world(_ctx: ConsoleContext): void {
  console.log("Hello from dweb console!");
}
