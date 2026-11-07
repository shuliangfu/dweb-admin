# WebChat 富媒体依赖／安全 DIG 备忘（HOLD 实现）

> 日期：2026-11-07 Asia/Shanghai  
> 仓：`dweb-admin`（本机脏树，**未 commit／禁 push／JSR／合 main**）  
> 对齐：`docs/webchat-rich-media-dig.md`  
> 裁定（用户／PM）：**校验全开＋本机 ClamAV（MVP）**；**VirusTotal 补扫后做**。  
> 富媒体 UI／WS／模型实现仍等 Figma「WebChat Media」；本文只 DIG／接法备忘。

---

## A) 安全 DIG（优先收口）

### A.1 已有校验清单（`@dreamer/upload@2.0.0`，读源码）

| 面 | 行为（默认） | 源码 |
| --- | --- | --- |
| 鉴权 | `requireAuth` **默认 true**；未配 `authenticate` → 写操作 401 | `upload/src/server/mod.ts` `runAuth`／`MultipartUploadHandlerConfig` |
| 授权 | `authorizeUpload(ctx, init, req)` 可 403 | 同上 |
| 会话绑定 | `uploadId → key/chunks/mime/authUserId`；忽略客户端篡改 key；异 userId 续传 403；未知／非 UUID uploadId → 404 | `server/mod.ts` `UploadSession`／`assertSessionOwner`／`getSession`；`utils.ts` `isUuid` |
| 大小 | `maxFileSize`（handler 默认 5GB，应用须收紧）、`maxPartSize`（默认 100MB） | `server/mod.ts` config |
| MIME allowlist | `allowedMimeTypes` 非空时：缺 mime／不匹配均拒 | `server/mod.ts` init；`utils.ts` `validateFile`／`matchMimeType` |
| 扩展名黑名单 | `DEFAULT_FORBIDDEN_EXTENSIONS`（exe／脚本／html／svg／wasm／js…）；**双扩展** `a.php.jpg` 各段检查；可 `forbiddenExtensions` 追加 | `constants.ts`；`utils.ts` `findForbiddenExtension` |
| MIME 黑名单 | `DEFAULT_FORBIDDEN_MIME_TYPES`（html／svg／js／可执行等） | `constants.ts`；`validateFile`／`validateMimeType` |
| 文件名归一 | NFKC、剥控制／RTL、全角点→`.`、空字节截断 | `utils.ts` `normalizeFilenameForPolicy` |
| 路径穿越 | `sanitizeObjectKey`／`resolveSafePath`／`assertPathSafe`；staging `uploadId` 须 UUID | `utils.ts`；`adapters/local-cloud.ts`；`storage-manager.ts` |
| 对象键 | `sanitizeFilename`＋UUID 文件名；`pathPrefix` 可隔离租户前缀 | `server/mod.ts` `generateKey` |
| 魔数 | `detectMimeType`／`validateMimeType`；image／audio／video **无魔数拒**；MZ／Mach-O 拒 | `utils.ts` `MAGIC_BYTES` |
| 危险载荷启发式 | `scanDangerousPayload`：HTML／SVG／PHP／GIF·PNG polyglot／PDF 内嵌 MZ（**非杀毒**） | `utils.ts` |
| 扩展↔内容一致 | png 当 .gif 等拒 | `validateContentExtensionConsistency` |
| 合并后二次校验 | `verifyContentAfterComplete` **默认 true**；默认只拉头 **64KiB**；失败删对象 → `CONTENT_REJECTED` | `server/mod.ts` complete；`BYPASS_MATRIX.md` |
| 分片完整性 | index∈[0,chunks)；complete 须全覆盖 | `server/mod.ts` |
| 危险 ACL | `public-read-write` 默认拒 | `utils.ts` `assertSafeAcl` |
| 错误脱敏 | `redactErrorMessage` | `utils.ts` |
| 可观测 | `onEvent`（**异常吞掉，不能拒传**） | `server/mod.ts` `emit` |
| 绕过矩阵文档 | 真杀毒／深层 polyglot／加密壳标 **未堵（非目标）** | `upload/docs/zh-CN/BYPASS_MATRIX.md` L26 |

**够不够（相对 WebChat guest 图／文件／语音）？**

- **防 XSS／脚本冒充图／路径穿越／匿名乱写／双扩展**：默认校验 **够硬**，应 **全开勿关**（禁 `requireAuth:false`／`verifyContentAfterComplete:false` 上生产）。
- **真恶意软件／宏毒文档／加密壳**：包内 **无自动杀毒**；`@dreamer/upload/scanner` 是**独立导出**，**未**挂进 `MultipartUploadHandler`。裁定：MVP 用本机 **ClamAV** 补上。

### A.2 缺口（相对 guest 图／文件／语音）

1. **dweb-admin 未挂 upload**：`api/config/main.ts` 无 `upload`；`deno.json` **无** 直接依赖 `@dreamer/upload`（仅经 dweb 传递出现 node_modules）。
2. **guest 鉴权未接**：须 `authenticate` 认 `guestToken`／`adminToken`（对齐 `api/ws-chat.ts`／`guestFromToken`）；`authorizeUpload` 限 path 前缀 `chat/{sessionId}/…`。
3. **allowlist 未配**：须显式收窄 MIME／体积（建议图≤5MB、文件≤20MB、语音≤2MB／60s；MIME 白名单 jpeg/png/webp/gif、pdf/zip/txt/办公、webm/mp4 音频）。
4. **语音魔数／主类型**：`MAGIC_BYTES` 有 `video/webm`、弱 `video/mp4`；声明 `audio/webm`／`audio/mp4` 时主类型 `audio`≠`video` 可能误拒——实现刀需对齐声明或扩魔数映射（备忘，勿本刀改 upload）。
5. **下载口**：`MultipartUploadHandler.handle` 只服务 `init/chunk/complete/abort/status`；`publicFileBasePath`（默认 `{basePath}/file?key=`）**需应用自挂**读文件路由＋鉴权／或签名，否则 URL 不可用或裸奔。
6. **杀毒未接线**：`ClamAVScanner` 在 `upload/src/scanner.ts`；`onEvent` **不能**同步拒传。MVP 须 **complete 外包／包装 handler**：成功合并后 `storage.download` → `ClamAVScanner.scan` → 不通过则删对象并改回 `CONTENT_REJECTED`（或 422）。
7. **头窗限制**：二次校验默认 64KiB；ClamAV 应对 **全文件**（或至少完整对象）扫，补头窗之后的载荷。
8. **滥用面**：guest 可传文件／语音（已裁要开）→ 须 rate limit＋体积硬顶＋路径隔离；现 api cors 有本机 origin，上传限流未配。
9. **断点续传**：分片 API 已有；会话在 **内存**——多进程／重启丢会话（单机 dev OK；多副本要外置 store，后置）。

### A.3 杀毒方案（已裁）

| 方案 | 接入点 | 依赖／运维 | MVP |
| --- | --- | --- | --- |
| **本机 ClamAV（裁定 MVP）** | complete 后同步扫（包装 handler，**勿**只靠 `onEvent`） | `clamd` TCP（默认 3310）；`ClamAVScanner({host,port})` from `@dreamer/upload/scanner`；病毒库 `freshclam` | ✅ |
| VirusTotal | 同接口 `VirusTotalScanner`；可 `MultiScanner`／异步补扫 | API Key、配额、延迟、**访客文件出网隐私** | **后置**（裁定） |
| 仅加强校验不扫 | allowlist＋魔数＋启发式 | 零运维 | ❌ 已否决作唯一方案 |

### A.4 ClamAV 部署要点（MVP）

**Mac 本机（开发）**

- `brew install clamav` → 配 `freshclam.conf`／`clamd.conf`（例：`TCPSocket 3310`，`TCPAddr 127.0.0.1`）。
- `freshclam` 更新病毒库；`clamd` 守护；探针：`ClamAVScanner.isAvailable()` → PING/PONG。
- api 配 `CLAMAV_HOST=127.0.0.1` `CLAMAV_PORT=3310`；不可用时策略：**拒传（安全优先）** 或显式 `CLAMAV_REQUIRED=0` 仅本地逃生（文档标明，禁默认生产关）。

**Docker（对齐现 `docker-compose.dev.yml` 只起 mongo）**

- 加法服务例：`clamav/clamav` 或 `mkodockx/docker-clamav`，暴露 `127.0.0.1:3310:3310`；api 连 `clamav:3310`（compose 网）或宿主机端口。
- 体积／内存：官方镜像病毒库较大（数 GB 级常见），首次 `freshclam` 慢；dev 可 `unless-stopped`＋命名 volume 缓存库。
- **成本**：无云费；本机／容器 CPU 在 complete 时同步扫——语音／大文件注意超时（scanner `timeout` 默认 30s，可调）。

**CI**

- 单测：mock `VirusScannerInterface` 或不启 clamd；可选 job 起 clamav service 做冒烟。
- 勿把真实恶意样本进仓；用 EICAR 测试串即可。

**病毒库更新**

- 容器／本机 cron 或镜像入口已带 `freshclam`；文档写清「库过期＝漏检」。

### A.5 VirusTotal 后置（一句话）

complete 过 ClamAV 后，用 `VirusTotalScanner`（或 `CachingVirusScanner`）**异步**补扫同一对象；命中则隔离／删＋审计，**不挡 MVP 同步发送路径**；需 API Key，访客文件出网需产品确认。

### A.6 dweb-admin 接法（配置／钩子路径｜未实现）

```
api/config/main.ts  →  AppConfig.upload = {
  basePath: "/upload",
  localDir: "./uploads",                  // 或 env CS_UPLOAD_DIR
  publicFileBasePath: "/upload/file",
  requireAuth: true,                      // 保持默认
  verifyContentAfterComplete: true,       // 保持默认
  maxFileSize: …,                         // WebChat 顶
  allowedMimeTypes: [ … ],                // 白名单
  pathPrefix: "chat",                     // 或 generatePath
  authenticate(req) → { userId: guest.sessionId | adminId },
  authorizeUpload(ctx, init) → path 必须以 chat/{sessionId}/ 开头,
  // scanner：dweb UploadAppConfig 无现成 scanner 字段 → 应用层包装
}
```

依赖（实现刀时再加，本 DIG 不加）：

- `deno.json`／`package.json`：`jsr:@dreamer/upload@^2`（需 `/adapters`／`/server`／`/scanner`／`/client` 子路径）。
- dweb 已有 `registerUploadIntegration`（`dweb/src/feature/upload.ts`，在 `app.ts` 启动调用）——配了 `upload` 即挂中间件。

**ClamAV 推荐接线（应用层，因 handler 无 scan 钩子）**

1. 配 `upload` 拿齐校验＋local storage；**或**自行 `createLocalCloudStorageAdapter`＋`createMultipartUploadHandler`。
2. 在 api 包一层 middleware：对 `POST {basePath}/complete`，先交 handler；若 2xx，按会话 key `storage.download` 全量（或流式）→ `new ClamAVScanner({host,port}).scan(bytes)` → `!safe` 则删对象并改写响应为 `CONTENT_REJECTED`。
3. **不要**只把扫毒放进 `onEvent`（吞异常且不改响应）。
4. 另挂 `GET {basePath}/file?key=`：`assertPathSafe`＋鉴权（仅会话参与者）或短时签名 URL。

Guest 绑权限：

- 开会话：`POST /cs/open` → `createGuestSession` → `guestToken`（`common/service/cs.ts`）。
- 上传：`authenticate` 读 header／query `guestToken` → `guestFromToken`；`userId = sessionId`；`authorizeUpload` 强制 `pathPrefix`=`chat`＋`{sessionId}/`。
- Admin：对齐 WS `adminToken`。
- 下载／WS 发 media.url：服务端只认本上传域＋该 session 前缀（见 dig §2.2）。

贴纸资源建议：

- **系统贴纸包**：静态目录（如 `common/assets/stickers/` 或 FE／mobile 静态），**不走 upload**；消息 `kind:sticker` 只发 stickerId。
- **自定义贴纸**：再走 upload＋与图相同扫描策略。

### A.7 与 dig 对齐的接入清单（文件级｜HOLD）

| # | 文件／位置 | 动作（等 Figma 后再做） |
| --- | --- | --- |
| 1 | `deno.json`／`package.json` | 直依 `@dreamer/upload@^2` |
| 2 | `api/config/main.ts`（及 dev／prod） | `upload: { … }` 校验全开＋localDir |
| 3 | `api/…` 新模块（如 `api/upload-clamav.ts`） | complete 包装＋ClamAV；file 下载路由 |
| 4 | `docker-compose.dev.yml` | 可选 `clamav` 服务 |
| 5 | `common/service/cs.ts`／`common/models/chat-session.ts + chat-message.ts` | `kind`＋`media`；URL 域校验 |
| 6 | `api/ws-chat.ts` | chat 加法字段（禁二进制） |
| 7 | `common/components/WebChat.tsx` | 工具条／气泡；客户端用 `@dreamer/upload/client` |
| 8 | FE／mobile／backend 壳 | 仍只调 WebChat；无第二套聊天逻辑 |
| 9 | 贴纸静态资源 | `common/assets/stickers`（或约定路径） |
| 10 | `.env.example` | `CLAMAV_HOST`／`PORT`／`CLAMAV_REQUIRED` |
| 11 | `docs/webchat-rich-media-dig.md` | 保留；本文补接法 |

---

## B) 分片／断点 API 形状（复用包，备忘）

`basePath` 默认 `/upload`（`upload/src/server/mod.ts` `handle`）：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| POST | `{base}/init` | JSON：`filename,fileSize,chunks,mimeType?,path?,metadata?,overwrite?` → `uploadId,key` |
| POST | `{base}/chunk` | FormData：`uploadId,index,file` |
| POST | `{base}/complete` | JSON：`uploadId,key,chunks[],filename` → `fileId,url?` |
| POST | `{base}/abort` | 取消 |
| GET | `{base}/status?uploadId=` | 已传分片（断点查询） |

客户端：`@dreamer/upload/client`（分片／续传）。  
local 根：`AppConfig.upload.localDir` → `createLocalCloudStorageAdapter({ baseDir, publicFileBasePath })`。

---

## C) 禁项／HOLD

- 禁 push／JSR／合 main／CloudAgent  
- 禁本刀改 WebChat 业务、WS 协议、大段 UI  
- 禁关默认安全开关上生产  
- 富媒体实现等 **Figma WebChat Media**  
- VirusTotal **后置**，不挡 MVP 同步路径  

---

## D) 四段短报（给经理）

**改了啥**：只新增本备忘 `docs/webchat-rich-media-prep.md`（未 commit）；未改业务代码。  
**验点**：对照 `upload` 2.0 源码＋`BYPASS_MATRIX`；确认 scanner 未内置进 handler；`api/config` 无 upload；guest 鉴权可复用 `guestFromToken`。  
**未做**：未挂 upload、未起 ClamAV、未加依赖、未改 WebChat／WS、未补 Figma。  
**禁项**：禁 push／JSR／合 main；禁大实现；VT 后置；等 Figma 再开富媒体刀。


---

## E) 实现落成（2026-11-07 Asia/Shanghai）

已开刀（禁 push／JSR／合 main／未 commit）：

- `AppConfig.upload`＋`api/cs-upload.ts`（鉴权／`chat/{sessionId}/`／MIME／ClamAV complete 外包／`GET /ui-view-upload/file`）
- 模型／服务／WS：`kind`＋`media`；HTTP 上传拿 URL → WS meta
- `common/components/WebChat.tsx` 富媒体 UI＋`webchat-stickers.ts`
- 依赖：`jsr:@dreamer/upload@^2`（deno.json／package.json）
- ClamAV：本机未装 → `CLAMAV_REQUIRED=0` 降级放行并打日志；起服：`brew install clamav` → TCP 3310 → `clamd`＋`freshclam`
