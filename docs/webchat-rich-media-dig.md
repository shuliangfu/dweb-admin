# WebChat 富媒体 DIG＋设计方案（闸报）

> 日期：2026-11-07 Asia/Shanghai  
> 范围：**只 DIG／定设计**，未落实现、未推协议、禁 push／JSR／合 main。  
> Figma MCP 配额已满：本文件基于现稿节点描述＋建议新增帧清单；现稿 `https://www.figma.com/design/s5vVLVhlXFe19dO5Mmg3Sl`（历史 `3:2` FE Home、`4:2` Mobile Home）。  
> 目标组件名：**WebChat**（磁盘已是 `common/components/WebChat.tsx`）。

---

## 0) 现状 DIG（只读依据）

| 面 | 现状 | 文件 |
| --- | --- | --- |
| 共用聊天核心 | **仅文本**：气泡渲染 `text`；输入＝Input＋发送；绿点「已连接」 | `common/components/WebChat.tsx` |
| WS 协议 | 帧：`join`／`leave`／`chat`；`chat` payload＝`{room,text}`；回推 `{room,id,fromName,fromRole,fromId,text,time}` | `api/ws-chat.ts` |
| 服务／模型 | `CsMessage` 仅 `text`；`CS_MAX_TEXT=500`；`CS_MIN_SEND_GAP_MS=400` | `common/service/cs.ts`、`common/models/chat-session.ts + chat-message.ts` |
| 壳 | FE `CsSupportFloat` 浮窗；mobile `/support` 整页；backend 设备分流（整页／浮窗／新窗）均调 WebChat | `frontend/…`、`mobile/routes/support.tsx`、`backend/components/*` |
| 上传 | **未挂**：api／backend config **无** `upload`；`package.json` 有 `@dreamer/storage`，**无** `@dreamer/upload` | `api/config/`、`deno.json`／`package.json` |
| 可复用仓外能力 | `@dreamer/upload` 分片／断点／S3·OSS·COS·local；`dweb` `AppConfig.upload` 一等挂载；`@dreamer/image` 缩略图 | `dreamer-jsr/upload`、`dweb/src/feature/upload.ts`、`image/` |
| 参照仓 | douwanjia `ws-chat` 同为**纯文本**协议，无可抄富媒体帧 | `douwanjia/src/api/ws-chat.ts` |
| DIG 截图 | 输入条仅文本＋发送，无工具条／气泡类型／录音态 | `.dig-shots/mobile-support-app.png`、`fe-cs-float-debug.png` 等 |

结论：现仓客服＝文本 IM 骨架；富媒体需**模型＋协议＋上传链路＋UI**四层增量，**勿在 WS 上硬塞二进制**。

---

## 1) 能力矩阵（文字表）

| 能力 | 桌面（≥1024／新窗／FE 浮窗） | 平板（768–1023／Modal·浮窗） | 手机（&lt;768／整页 App） | 现状 | 建议 MVP |
| --- | --- | --- | --- | --- | --- |
| **文本** | Enter 发送；Shift+Enter 换行 | 同左 | 软键盘；大触控发送 | ✅ 已有 | 保留；可升 `CS_MAX_TEXT` |
| **emoji／贴纸** | 工具条😊 → 面板；emoji 进文本；贴纸＝短图消息 | 同左；面板更大触控 | 同左；面板贴底安全区 | ❌ | **P0 emoji（Unicode）**；贴纸＝P1（走 image kind） |
| **图片** | 点📷／拖放／粘贴；本地预览→确认发送；气泡内缩略图点开灯箱 | 点选／相册；预览确认 | 相机／相册；预览全屏确认 | ❌ | **P0**：上传后 WS 发 meta |
| **文件** | 📎 选择；气泡＝文件卡（名／大小／下载） | 同左 | 同左（系统分享器选文件） | ❌ | **P1** 或与图同刀裁体积 |
| **语音发送** | 🎤 按住／点录；波形；发送／取消 | 同左 | **按住说话**为主（微信感） | ❌ | **P1**（权限＋格式差异大） |
| **语音播放** | 气泡内播放条＋时长 | 同左 | 同左；不抢系统音频焦点过猛 | ❌ | 随语音发送 |
| **预览／发送确认** | 图／文件／语音统一「预览条 → 发送／取消」 | 同左 | 同左（底抽屉） | ❌ | **P0 与图同出** |

跨端差异要点：

- **触控**：手机语音＝长按；桌面＝点录＋空格可选。
- **桌面**：拖放／粘贴图进草稿；浮窗宽度紧，工具条图标化。
- **安全区**：mobile 工具条／录音条避 `safe-area-inset-bottom`（底 Tab 已占）。
- **三壳不变**：整页／浮窗／新窗只包 WebChat；富媒体 UI 全在 WebChat 内。

---

## 2) 建议协议／存储（选项＋推荐）

### 2.1 消息模型（Mongo `chat_messages`）

**推荐**：扩展字段，兼容旧行（无 `kind` 视为 `text`）。

```ts
kind: "text" | "emoji" | "image" | "file" | "voice" | "sticker"
text?: string          // text／emoji 正文；其它 kind 可作 caption／空
media?: {
  url: string          // 可访问 URL（同源或签名）
  mime: string
  name?: string        // 原文件名
  size?: number        // bytes
  width?: number
  height?: number
  durationMs?: number  // voice
  thumbUrl?: string    // image／sticker 缩略图
}
```

`lastPreview`：按 kind 生成「[图片]」「[文件] xxx」「[语音]」等。

### 2.2 WS 协议

| 方案 | 做法 | 优 | 劣 |
| --- | --- | --- | --- |
| **A（推荐）HTTP 上传 + WS meta** | 客户端先 `POST /upload/...` 得 URL，再 `emit("chat", { room, kind, text?, media })` | 不撑爆 WS；复用 `@dreamer/upload` 分片／鉴权；易限速 | 两步；需会话级 upload token |
| B WS 二进制帧 | 直接在 `/ws` 传 blob | 一步 | 背压／断线难；与现 JSON 帧冲突；现 client 未做 |
| C 仅轮询 HTTP 发消息 | 无 WS 媒体 | 简单 | 实时差；违背现架构 |

**推荐 A**。WS `chat` **加法**字段；旧客户端只认 `text` 时可降级显示 `[图片]`。

示意（勿当已定稿硬编码）：

```json
{ "room": "cs:…", "kind": "image", "text": "", "media": { "url": "/upload/…", "mime": "image/jpeg", "size": 12345, "thumbUrl": "…" } }
```

服务端：`sendCsChat` 校验 kind／media；**禁止**信任客户端随意 URL（只接受本上传域／签名路径）。

### 2.3 存储

| 方案 | 做法 | 优 | 劣 |
| --- | --- | --- | --- |
| **A'（推荐 MVP）local + `@dreamer/upload`** | api 挂 `AppConfig.upload`（`dweb` 已有 hook）；`localDir`；guest／admin 各鉴权 | 零云账号；本机可验 | 多机部署要换云 |
| B' 云（S3／OSS／COS） | upload adapters | 可扩 | 需密钥／配置；超本刀 |
| C' 只 Mongo GridFS | 二进制进库 | 单系统 | 胖库；与 upload 包重复 |

**推荐 A'**；预留 storage adapter 接口，云作后续。

断点续传：

- **图／语音**（通常 &lt;5–10MB）：**不必**断点；单 POST／短分片即可。
- **文件** ≥ 阈值（建议 5MB）：开 `@dreamer/upload` **resumable／chunked**。
- MVP 可：**全员单次上传 + 体积硬顶**；大文件续传标 P2。

### 2.4 权限／体积（建议默认，待裁）

| 项 | 建议 |
| --- | --- |
| 鉴权 | guest：`guestToken`（仅本 session 前缀路径）；admin：登录态／`adminToken` |
| 图片 MIME | `image/jpeg|png|webp|gif`；单张 ≤ **5MB** |
| 文件 | 白名单（pdf／zip／txt／常见办公）；单文件 ≤ **20MB**；禁可执行 |
| 语音 | `audio/webm`／`audio/mp4`（Safari）；时长 ≤ **60s**；≤ **2MB** |
| 频率 | 沿用 `CS_MIN_SEND_GAP_MS`；上传另计（如 10／分钟／会话） |
| 保留 | 会话关闭后 N 天清（可后续）；MVP 可先不自动清 |

---

## 3) UI／Figma 设计意图（配额满 → 建议补帧）

现稿偏 Home；客服壳已有代码气质（紫渐变顶栏／圆角气泡），富媒体帧**建议新建一页 `WebChat Media`**，勿硬塞进门户 Home。

### 建议新增帧清单

1. **WC-Toolbar-Desktop** — 输入工具条：😊 📷 📎 🎤 ｜输入框｜发送  
2. **WC-Toolbar-Mobile** — 同上＋安全区；🎤 强调按住  
3. **WC-Bubble-Text／Image／File／Voice／Sticker** — 五种气泡（我方紫／对方白）  
4. **WC-Emoji-Panel** — emoji 网格（桌面浮层／手机底抽屉）  
5. **WC-Image-Preview-Confirm** — 选图后预览条＋发送／取消  
6. **WC-File-Card** — 文件名／大小／下载图标  
7. **WC-Voice-Recording** — 录音中（波形／时长／上滑取消）  
8. **WC-Voice-Bubble-Playing** — 播放态  
9. **WC-Lightbox** — 图片点开  
10. **WC-Shell-Float／Page／Popup** — 三壳里工具条不裁切（对照现 FE 浮窗／mobile 整页／backend 新窗）

视觉原则：延续现 WebChat（indigo／violet、圆角 2xl、绿点）；工具条图标 ≥ 44pt 触控；浮窗内工具条可「＋」收纳二级（图／文件）。

---

## 4) 缺口列表（需 PM／用户裁范围）

**必须先裁：**

1. **MVP 范围**：是否只做「文本＋emoji＋图片＋预览确认」，文件／语音下一刀？  
2. **贴纸**：系统贴纸包 or 仅 emoji？自制包谁维护？  
3. **存储**：本机 local 是否够（单机／Docker）？要不要一上云？  
4. **断点续传**：MVP 要不要（建议文件＞5MB 才要，否则砍）。  
5. **访客上传权限**：匿名 guest 能否传文件／语音？（滥用面）——建议 guest 仅图＋emoji，文件／语音限 admin 或需验证码。  
6. **病毒／内容扫描**：`@dreamer/upload` 有 scanner 钩子——MVP 开不开？  
7. **历史消息兼容**：旧纯 `text` 行只读展示即可（已兼容）。  
8. **Figma**：MCP 配额恢复后由设计刀补帧，或接受「代码先按本文意图、后补帧」。

**明确未做（本 DIG）：**

- 未改 WebChat／ws-chat／CsMessage 实现  
- 未挂 upload、未加依赖、未推协议  
- 未改 Figma（配额满）  
- 未 push／JSR／合 main  

---

## 5) 推荐落地顺序（待裁后）

1. 模型 `kind`＋`media`；WS chat 加法；UI 仍只显 text（兼容）。  
2. api 挂 `@dreamer/upload` local；guest／admin 鉴权。  
3. WebChat 工具条＋图片预览确认＋image 气泡＋灯箱。  
4. emoji 面板（Unicode）。  
5. 文件卡；语音录制／播放（分端手势）。  
6. 断点续传／云存储／扫描 —— 按裁剪。

---

## 6) 禁项

- 禁 push／JSR／合 main／CloudAgent  
- 禁在 DIG 阶段瞎推二进制 WS 协议  
- 禁破坏现有 fill／绿点／三壳设备分流／FE·mobile 分道  
