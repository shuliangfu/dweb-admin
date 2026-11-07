/**
 * api 应用入口
 * 配置由 common/config + api/config 自动加载并合并
 */

import { App } from "@dreamer/dweb";
import { registerCsChatWs } from "@api/ws-chat.ts";

const app = new App();

// websocketServer lands in the container after init; register CS handlers on start.
app.on("start", () => {
  registerCsChatWs(app);
});

app.start();
