/**
 * 生产环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
 */
export default {
  server: {
    host: "0.0.0.0",
    // Dev listens on APP_PORT_BACKEND (3100). Production matches docker-compose
    // (container port 3000, same as common/config/main.prod.ts).
    port: 3000,
  },
};
