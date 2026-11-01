# dweb-admin 接手文档（handoff）

> 面向后续代理人／开发者的全面接手说明。中文为主；**路径与包名以本机实况为准**。  
> 生成：2026-11-01（Asia/Shanghai）。配套对照表见同目录 `page-migration-matrix.md`、扩展包清单见 `extension-packages.md`。

---

## 1. 项目是什么、目录、与 dreamer-jsr 的关系

### 是什么

**dweb-admin** 是基于 Deno + `@dreamer/dweb` 的**后台管理模板／控制台**，用 `@dreamer/view`（JSX）+ `@dreamer/ui-view` 重写原 Vue 管理端的壳层与业务页。目标是可运行的 Yii2 风格 RBAC 后台（角色／权限／路由图 + 管理员 `roleCodes`），列表统一走「数据面板」约定。

### 本机路径

| 角色 | 路径 |
|---|---|
| **本仓库（改造目标）** | `/home/deno/dreamer-jsr/dweb-admin` |
| **Mac 等价路径** | `/Users/shuliangfu/worker/deno/dreamer-jsr/dweb-admin` |
| **Vue UI 参照（已确认）** | `/home/vue/dreamer-vue` |
| **dreamer-jsr 工作区根** | `/home/deno/dreamer-jsr` |

历史派单别名 `dreamer-admin` **已更正**为 `/home/vue/dreamer-vue`（包名 `dreamer`，远程 `git@git.shuliangfu.com:dreamer-vue.git`）。本机**没有**单独的 `/home/vue/dreamer-admin` 树。

### 与 dreamer-jsr 的关系

- `dweb-admin` 是 **dreamer-jsr 工作区里的一个应用仓库**，与同级包（`view`、`ui-view`、`dweb`、`database`…）通过 **JSR / `deno.json` imports** 依赖，**不是**把扩展源码拷进本仓。
- 后台 UI 与路由在 **`backend/`**；同仓还有消费端骨架 `frontend/`、`mobile/`、`api/`、`console/`（本轮改造焦点是 **backend 管理端**，勿把工作摊到无关应用）。
- **禁止**改动／自举其它产品仓：`douwanjia`（抖玩家）、`senvis`（知微）、`quant`、`care-guard` 等均不在本任务范围。

### 仓内顶层目录（摘要）

```
dweb-admin/
  backend/          # 管理端入口、routes、壳层与 *Admin 组件、rbac-guard
  common/           # 跨端：model / service / i18n / components(DataPanel) / stubs / config
  frontend/         # 另端应用（非本轮焦点）
  mobile/           # 另端应用（非本轮焦点）
  api/              # 另端应用（非本轮焦点）
  console/          # CLI 侧
  docs/             # handoff / matrix / extension-packages
  scripts/          # seed 等
  runtime/          # 运行时辅助
  tests/
  deno.json         # tasks + imports（@dreamer/*、@common/、@backend/…）
  docker-compose*.yml
```

---

## 2. UI 参照与全站对稿标准

### 参照仓

- **唯一 UI 参照**：`/home/vue/dreamer-vue`（已确认，非临时／待确认）。
- 对稿范围：**全站**——侧栏、顶栏、二级头／多标签、登录／锁屏／错误页，以及侧栏菜单覆盖的**全部内容页**（RBAC／系统／会员／CMS／财务／统计／开发者等）。勿只做单页「能开」而忽略壳层或菜单叶子。

### 技术约束（对稿时的实现栈）

| 层 | 用法 |
|---|---|
| 视图运行时 | **`@dreamer/view`**（`deno.json` 中 `jsxImportSource`） |
| 组件库 | **`@dreamer/ui-view`**（及 `/data-display`、`/plugin` 等子路径） |
| **禁止** | 第二套 UI 库；`ui-preact` / `ui-react`；在仓内另写一套 Table／Menu／Modal |

### DataPanel（数据面板）约定

Vue 侧几乎所有列表共用 `CardPanel`（`/home/vue/dreamer-vue/src/components/Card/CardPanel.vue`）：标题、工具条（新建／搜索／刷新／打印／导入／导出／列设置）、搜索 schemas、表格列、行操作、分页。

dweb-admin 对应物：

| 规则 | 说明 |
|---|---|
| **优先** | `@dreamer/ui-view` 已有能力（`Table`、`Card`、`Pagination`、`Modal`、`message`、表单控件等）直接用 |
| **仓内封装** | 无 CardPanel 等价导出时，在 **`common/components/DataPanel.tsx`** 组合 ui-view，**不要**再造第二个面板库 |
| **列表页** | 模型列表与 stub 均应消费 `DataPanel`；自定义 `children` 表格时用 `children={(ctx) => …}`，列开关经 `ctx.filterTableColumns`／`isColumnHidden` 真正藏列 |
| **导出** | 默认稳定 **CSV**（`downloadCsv`，带 BOM）；Excel／XML／HTML **仅当** `deno.json` 已有真实依赖再接，禁止硬造 |
| **导入** | 有可行解析则 CSV→`parseCsv`→`onImportRows`；否则保留回调位，勿假接后端 |

详表见 `docs/page-migration-matrix.md` §0。

---

## 3. 应优先复用的 dreamer-jsr 扩展包

完整扫描表见 **`docs/extension-packages.md`**（可合并阅读）。接手时**优先复用、勿另写已有扩展**：

| 包目录（在 dreamer-jsr 根下） | JSR 名 | 对本仓角色 |
|---|---|---|
| `view` | `@dreamer/view` | 细粒度响应式 JSX，**页面必用** |
| `ui-view` | `@dreamer/ui-view` | 桌面组件库；壳层 + 表格／表单／反馈 |
| `theme` | `@dreamer/theme` | 亮暗主题；壳层 ThemeMenu／SettingsDrawer |
| `i18n` | `@dreamer/i18n` | 语言辅助；文案主体在 `common/i18n/` |
| `dweb` | `@dreamer/dweb` | 全栈应用框架（路由、load、SSR） |
| `render` / `router` / `plugins` | `@dreamer/render` 等 | 经 dweb 使用 |
| `middlewares` | `@dreamer/middlewares` | HTTP 中间件；与自有 `rbac-guard` 串联 |
| `database` | `@dreamer/database` | Mongo 模型基类 |
| `cache` | `@dreamer/cache` | 会话／缓存 |
| `humancheck` | `@dreamer/humancheck` | 验证码／TOTP |

数据面板相关 ui-view 模块：`data-display`（Table／Card／Tag…）、form、navigation（Pagination／Menu／Sidebar…）、feedback（Modal／Drawer／message）。**今日无**独立 `CardPanel`／`DataPanel` 导出 → 继续在 `common/components/` 组合。

低优先级／基建包（auth、session、email、upload…）见 extension-packages 后半；**不要**为 admin 模板去 fork 或重写这些包。

---

## 4. 技术栈实际写法（本仓惯例）

### Deno 与入口

- 包管理／任务：根目录 **`deno.json`**（`imports`、`tasks`、`compilerOptions.jsxImportSource = "@dreamer/view"`）。
- 管理端入口：`backend/main.ts`（`App` from `@dreamer/dweb`；中间件：requestId → logger → health → rateLimit → errorHandler → csrf → **`rbacGuardMiddleware`**；插件：tailwind、static、theme、ui-view）。
- 配置：`common/config` + `backend/config/main.ts`（`routesDir: "./backend/routes"`，`render.engine: "view"`，`mode: "ssr"`，默认端口 `APP_PORT_BACKEND`／3100）。

### 路由

- **基于文件的路由**：`backend/routes/**`（例：`rbac/assign/index.tsx` → `/rbac/assign`）。
- `_app.tsx` / `_layout.tsx` / `_404.tsx` / `_error.tsx` 为壳与错误页。
- JSON API 同树下 `backend/routes/api/**`（如 `/api/users`、`/api/rbac/*`）。

### API 写法（本仓：`apiMode: "action"`）

框架（dweb **3.7.5** + `@dreamer/router` / `@dreamer/server` **1.2.1**）支持 `restful` 与 `action` 两种全局模式；**本仓两应用均固定 `action`**，handler **只导出方法名**，**禁止** `export const GET|POST|… = …` 别名。

| 项 | 约定 |
|----|------|
| 配置 | `backend/config/main.ts`、`api/config/main.ts` → `router.apiMode: "action"` |
| 导出 | `export function index` / `login` / `create` / `update` / `remove` … |
| 匹配 | ① `params.method`（`…/:method`）② 路径末段（kebab→camel）③ **仅 web**：`/api/<resource>`（两段且首段 `api`）回落 `index` |
| 动态资源 | 一动作一文件：`users/[id]/update.ts` → `/api/users/:id/update` |
| 纯 API 应用（`kind:"api"`，`:3003`） | 无 `/api` 前缀；**`GET /` 不会**自动调 `index`（server 回落未覆盖 apiOnly 根路径）。验证用 **`GET /index`**。`index.ts` 负责路由 `/` 的注册，但默认 action 需显式 `/index` 或等框架扩展——**勿为此升 dweb/server**（JSR 已是最新 3.7.5 / 1.2.1） |
| 示例 | `api/routes/index.ts`（`index`+`create`）；管理端 auth／account／users／rbac／menus 均为 action 导出 |

细节见 `backend/api-style.ts`。


### RBAC（Yii2 风格，非 Vue 直绑）


模型在 `common/model/rbac.ts` + `admin.ts`：

- `AuthItem`（role／permission）、`AuthItemChild`（父子图）、`AuthRoute`（可管理路由）。
- 用户侧：`AdminUser.roleCodes: string[]`；**没有** `AuthAssignment` 表，**没有**用户级 allow／deny，**没有**用户直绑路由 API。
- 判定：`common/service/rbac.ts` → `canAccess(roleCodes, method, path)`；守卫：`backend/rbac-guard.ts`。
- 分配页 `/rbac/assign`：Transfer 改 `roleCodes`，`PUT /api/users/:id`。Vue 的 allow／deny + 用户直绑路由是**模型缺口**——可做最小可扩展 UI＋文档说明，**禁止假接**。

### 主题

- `@dreamer/theme` + 壳层 `ThemeMenu`／`SettingsDrawer`；主色 CSS 变量 `--dweb-primary`（设置抽屉可调）。

### Tailwind 4 约定／禁 3.x 任意值

本仓 **`tailwindcss` ^4.1**（`deno.json`），入口 `backend/assets/tailwind.css`：`@import "tailwindcss"`、`@theme`、`@source`、`@custom-variant dark`。

**禁止**把本可用主题／间距刻度表达的尺寸写成 v3 风格方括号任意值（尤其 rem／整除 `--spacing` 的值）：

| 错误（3.x 习惯） | 正确（4.x） |
| --- | --- |
| `min-w-[8rem]` / `min-w-[10rem]` | `min-w-32` / `min-w-40`（默认 `--spacing: 0.25rem`，`N` → `N×0.25rem`） |
| `h-[56px]` / `max-w-[400px]` / `w-[88px]` | `h-14` / `max-w-100` / `w-22` |
| `max-w-[18rem]` / `min-h-[280px]` / `min-h-[360px]` | `max-w-72` / `min-h-70` / `min-h-90` |
| `min-w-[150px]` / `min-w-[170px]` | `min-w-37.5` / `min-w-42.5`（小数刻度合法） |
| `w-[36%]` / `pt-[18vh]` / `mb-[12vh]` | `@theme` 命名：`w-chat-pane` / `pt-lock-top` / `mb-lock-gap`（见 `tailwind.css`） |
| `text-[13px]` | `@theme --text-menu` → `text-menu` |
| `bg-[#667eea]` | 主题色或默认调色板：`bg-indigo-500`／`bg-primary-*` |
| `bg-[--token]`（v3 变量简写） | `bg-(--token)`（v4 圆括号简写） |
| `rounded-sm` / `shadow-sm`（视觉刻度已重命名） | `rounded-xs` / `shadow-xs`（若要对齐 v3 观感） |
| `border-t-[3px]` | `border-t-3` |

**允许保留方括号的情况**：真正无法进 `@theme`／刻度的一次性怪值（少用）；选择器变体如 `[&>img]:…`、属性选择器。新代码优先 `@theme` 命名 token 或刻度工具类。

改 class 后应用 `rg` 扫 `min-w-[`／`w-[`／`h-[`／`p*-[`／`m*-[`／`text-[`／`bg-[#` 等，避免回潮。


### 数据面板与列表页

- 封装：`common/components/DataPanel.tsx`（多格式 export／import、打印、列显隐、`DataPanelChildrenCtx`）。
- 真列表：`AdminsAdmin`、`ItemAdmin`、`MenusAdmin`、`RoutesAdmin`、`AssignAdmin`、`OnlineAdmin` + 对应 `backend/routes/...` load 真 API。
- Stub：`common/stubs/catalog.ts` + `StubList`／`StubSettings`／`StubChart`／`stub-page.tsx`；无领域模型前用演示行，且 **AUTH_ONLY 已收紧**（非超管需显式路由授权）。

### i18n

- `common/i18n/zh-CN.ts`、`en-US.ts` + `createT`；勿把用户可见文案写死在组件里（专有缩写／格式名除外）。

---

## 5. 目录结构、关键入口、本地跑法、git 约定

### 关键入口（改造时最常碰）

| 路径 | 用途 |
|---|---|
| `backend/main.ts` | 应用启动与中间件 |
| `backend/routes/_layout.tsx` | 登录后壳（侧栏＋顶栏＋TagView＋主区） |
| `backend/components/SideMenu.tsx` / `TopHeader.tsx` / `TagView.tsx` / `SettingsDrawer.tsx` | 壳层零件 |
| `backend/components/*Admin.tsx` | 各业务列表／表单 |
| `backend/rbac-guard.ts` | 鉴权／授权 |
| `common/components/DataPanel.tsx` | 数据面板 |
| `common/model/*` · `common/service/*` | 领域模型与服务 |
| `common/service/seed.ts` | 菜单／超管／RBAC 种子 |
| `docs/page-migration-matrix.md` | 页级对照与进度 |
| `docs/extension-packages.md` | 可复用 JSR 包 |

### 本地跑法（摘要）

```bash
cd /home/deno/dreamer-jsr/dweb-admin   # 或 Mac 等价路径
cp -n .env.example .env                # 按需改 Mongo / 端口
deno task mongo:up                     # docker compose 起 Mongo（dev）
deno task seed                         # 种子数据
deno task dev                          # 或 deno task dev:backend → backend/main.ts --dev
```

常用 task：`dev`／`dev:backend`、`seed`、`mongo:up`／`mongo:down`、`test`。默认后台约 **3100**（看 `.env` 的 `APP_PORT_BACKEND`）。

### Git 约定（当前派单）

| 规则 | 说明 |
|---|---|
| 工作区 | **只动本仓** `dweb-admin` |
| Commit | **本地英文** commit（语义清晰，如 `docs: …` / `feat: …`） |
| Remote | **勿自建 remote**；是否 push 听当轮派单。本轮接手文档：**勿 push** |
| 说明 | 本机若已存在 `origin`（例如曾指向 `https://github.com/shuliangfu/dweb-admin.git`），仍以当轮「勿 push／remote 待挂」为准，**不要擅自 push 或改 remote** |

---

## 6. 对照表、当前进度与未完项

### 必读对照表

- **`docs/page-migration-matrix.md`**：Vue 文件 ↔ dweb 路径／组件／状态（已有／部分／缺）。含壳层、全页、Home、RBAC、System、User、CMS、Finance、Count、Developer 与 DataPanel 专节。
- Vue 列表入口约 **64** 个 view（不含 modules）；侧栏叶子由 Mongo `menus` 种子覆盖。

### 已相对落地（截至本 handoff 撰写时，以 matrix + 仓库为准）

- 壳层：Side／Top／TagView／主题／设置抽屉（主色＋`--adm-accent`）——**部分**对齐；ChatModal 为分栏壳（无 IM 后端）；TagView keep-alive 不适用 SSR。
- 全页：login／lock／forget／reset／403／404／500——**部分**。
- Home：dashboard + workspace——**部分**。
- RBAC：admins／roles／permissions／routes／**assign（roleCodes＝允许型可跑；modal 含禁用 gap UI）**——**部分**；真 list／CRUD API。
- System：menus（CRUD）、online（真 AdminSession＋IP／UA＋踢下线）——**部分**；其余多为 stub。
- DataPanel：search／列显隐／多格式导出（CSV／HTML-as-xls／XML／TXT／JSON）＋导入解析／打印／图标工具条；children `filterTableColumns` 已接 admins／roles／menus；壳层顶栏高度对齐 Vue（`h-adm-top`）。
- Tailwind 4：禁止 3.x 任意值 bracket 烂用（见上文「Tailwind 4 约定」）。
- AUTH_ONLY 收紧：stub 页不再白名单放行，需超管或显式路由授权。

### 未完／仍弱（优先队列，细节以 matrix §12 为准）

1. **扫仓结论（2026-11-01）**：有领域模型却仍 stub 的页＝**无**。AdminUser／Auth*／Menu／AdminSession／AdminPasskey 相关 list／CRUD（含 online 踢下线、账号安全）已接真 API。
2. **无模型 stub 保持 stub**（勿假接）：会员／CMS／财务／统计／developer 备份反馈语言系统日志／system 设置与 admin-log 等——需先新增领域模型再接线。
3. **DataPanel**：浏览器侧 HTML-table-as-xls／XML／TXT／JSON 已接（对齐 Vue excel.js 思路，非 OOXML）；真 Excel 库／行级表单／与 Vue CardPanel store 驱动仍弱。
4. **RBAC 模型缺口**：Vue allow／deny＋用户直绑路由需 AuthAssignment 类模型后才能真接 Assign gap 面板。

### 工作区提示

接手时先看 `git status`／最近 commit；DataPanel children 过滤与 Assign gap UI 已提交则勿重复劳动。

---

## 7. 硬规则（必须遵守）

1. **禁 CloudAgent**（及同类云端代跑改写本任务）。
2. **对稿标准**：参照 **`/home/vue/dreamer-vue`**；全站含侧栏／顶栏／全部页面；实现只用 **view + ui-view**；DataPanel 约定见 §2。
3. **勿另写已有扩展**：能复用 `docs/extension-packages.md` 所列 JSR 包则复用；禁止在本仓平行实现第二套 UI／路由／主题框架。
4. **只改 `dweb-admin`**；勿碰自举／抖玩家／知微等产品仓。
5. **Git**：本地英文 commit；**勿自建 remote**；push 与否听当轮派单（本 handoff 提交轮次：**勿 push**）。
6. **诚实接线**：模型／API 没有的能力不造假后端；UI 可留扩展位并在 matrix／本文写明缺口。
7. **列表导出／导入**：CSV 优先；无依赖不硬造 Excel 等。

---

## 8. 建议阅读顺序（新人／新代理）

1. 本文 `docs/handoff.md`
2. `docs/extension-packages.md`
3. `docs/page-migration-matrix.md`（整表 + §12）
4. `deno.json` → `backend/main.ts` → `backend/routes/_layout.tsx`
5. `common/components/DataPanel.tsx` + 任一 `*Admin.tsx` + `common/model/rbac.ts`
6. Vue 对照：`/home/vue/dreamer-vue/src/views/...` 与 `components/Card/CardPanel.vue`

---

## 9. 修订记录

| 日期 (Asia/Shanghai) | 说明 |
|---|---|
| 2026-11-01 | 初版 handoff + matrix + extension-packages；模型扫仓／online kick；TW4 约定 |
| 2026-11-01 | API 双模板：handlers 双导出 restful+action；`backend/api-style.ts`；handoff § API；DataPanel 多格式导出／壳层视觉对齐 |
| 2026-11-01 | API 改 `apiMode:"action"`：hello→`index.ts`、去掉 REST 别名、动态一动作一文件；handoff 记明 kind:api 根 `/` 不回落 index；壳层 lock/login/TagView 打磨 |
