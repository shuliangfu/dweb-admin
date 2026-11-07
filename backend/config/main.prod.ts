/**
 * 生产环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
 */
export default {
  server: {
    host: "0.0.0.0",
    // Matches APP_PORT_BACKEND / docker container listen (8810).
    port: 8810,
  },
};
