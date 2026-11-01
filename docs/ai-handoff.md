# AI 零上下文接手入口（stop-work）

> **状态：续工。** 2026-11-01 用户要求接着完善后台模板。停工横幅已过期。\
> 本文仍是零上下文入口；细节见同目录长文。**勿 push**；**勿升依赖**；**禁
> CloudAgent**。

## 必读链

| 文档                                                          | 用途                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| **本文** `docs/ai-handoff.md`                                 | 零上下文入口：仓状态／已完成／未完／硬约定／依赖／下一刀 |
| [`docs/handoff.md`](./handoff.md)                             | 长文：栈、DataPanel、TW4、RBAC、跑法、硬规则、修订史     |
| [`docs/page-migration-matrix.md`](./page-migration-matrix.md) | Vue ↔ dweb 页级对照与进度                                |
| [`docs/extension-packages.md`](./extension-packages.md)       | 应复用的 dreamer-jsr／JSR 扩展包                         |

---

## 1) 仓路径／参照仓／当前 HEAD／remote

| 项                                           | 值                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **本仓（改造目标）**                         | `/home/deno/dreamer-jsr/dweb-admin`（Mac 等价：`/Users/shuliangfu/worker/deno/dreamer-jsr/dweb-admin`） |
| **机器**                                     | 用户 Mac.lan（本地仓；非 CloudAgent）                                                                   |
| **UI 参照仓**                                | `/home/vue/dreamer-vue`（包名 `dreamer`；**全站对稿唯一参照**）                                         |
| **dreamer-jsr 工作区根**                     | `/home/deno/dreamer-jsr`（同级 JSR 包：`dweb`、`server`、`view`、`ui-view`…）                           |
| **分支**                                     | `main`                                                                                                  |
| **停工时 HEAD（文档 commit 前）**            | `96c40e5` — `feat(rbac): deepen model pages vs Vue — search/detail/online/home chrome`                  |
| **完整 SHA（文档 commit 前）**               | `96c40e50180b660f01bdf9d3f8c0df57df2ff99f`                                                              |
| **remote**                                   | 已有 `origin` → `https://github.com/shuliangfu/dweb-admin.git`（fetch/push）                            |
| **领先 origin**                              | **`main` 领先 `origin/main` 共 32 个提交**（文档 commit 后应为 **33**；**勿 push**）                    |
| **停工时工作区脏文件（未提交，非本轮范围）** | 见下文「脏工作区」——**续工前先 `git status`，勿把未提交改动当成已完成**                                 |

### 脏工作区（已在续工中收口）

停工时未提交的 forget／reset／captcha 半成品已接完，不再是「未跟踪半成品」：

- 登录页与找回密码使用 `GET /api/auth/captcha`（`@dreamer/humancheck` SVG）+
  HttpOnly HMAC cookie。
- 表单登录必校验验证码；纯 JSON 登录仅在已有 captcha cookie 时校验。
- `POST /api/auth/captcha/check` 只校验验证码，**不发信**（`mail: false`）。
- 重置密码页仍是 UI 演示，**不写库**。

---

## 2) 已完成项（可视为落地）

### 菜单裁剪（种子 `common/service/seed.ts`）

- **会员**：仅三项——会员列表／活跃／僵尸（挂在**内容／CMS
  之上**的「会员管理」；叶子 icon 多为 `star`，SideMenu 对 blank/`star` 按 key
  回落 `ICON_BY_KEY`）。
- **已删／撤菜单**：`count*`、`finance*`、`cms.qa`、`cms.survey` 等（seed 里有
  obsolete drop 列表）。
- **系统管理**：仅三项
  stub——基本设置／地区／时间（`/system/base|region|datetime`）。
- **开发管理**：顶栏菜单组；**菜单管理**真页在
  `/developer/menus`（自系统迁出）；另 4 个 developer stub。
- **user 在 cms 上**：顶层 sort 会员在内容之上。
- **二级 star**：二级／叶子默认 `icon: "star"`；SideMenu 用 ui-view Icon +
  `ICON_BY_KEY`（非 Vue m-icon 全套）。

### 工程／框架

- **Tailwind 4**：`tailwindcss` ^4.1；禁 3.x 任意值 bracket 烂用（见
  `handoff.md` TW4 表）。
- **API
  `apiMode: "action"`**：`backend/config/main.ts`、`api/config/main.ts`；handler
  只导出方法名（`index`／`login`／…），禁 `GET|POST` restful 别名。
- **根 `/` 回落 index**：`@dreamer/server` **1.2.2** + `@dreamer/dweb`
  **3.7.6**；kind:api 无 `/api` 前缀时 `GET /`、`/users` 等回落
  `index`（已实测）。
- **JSR 链**：server **1.2.1→1.2.2**、dweb **3.7.5→3.7.6** 已发；本仓
  `deno.json` **锁** `@dreamer/dweb@^3.7.6`（传递 server
  1.2.2）；**勿再升无关依赖**。

### 壳层／对稿已对齐（部分～可用）

| 区域            | 说明                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **DataPanel**   | `common/components/DataPanel.tsx`：search／列显隐／CSV 等导出导入／打印；children `filterTableColumns` |
| **login／lock** | AuthShell／adm-lock；左饰＋锁屏背景／DS-Digital 时钟对稿                                               |
| **TagView**     | 多标签壳层已有；**keep-alive = N/A**（SSR）                                                            |
| **SideMenu**    | unique-opened、`ICON_BY_KEY`、menu 高／二级 hover 等 token                                             |
| **Settings**    | theme.other → `--adm-*` 可映子集；ColorRow／SizeRow                                                    |
| **RBAC**        | admins／roles／permissions／routes／assign：真 API；列与搜索／详情加深对 Vue                           |
| **online**      | `/system/online` 真 AdminSession＋kick；**无侧栏菜单**（OBSOLETE，仅 URL／RBAC）                       |
| **其它**        | TopHeader 高度、error 403/404/500 `adm-error`、home `adm-panel-card` 等                                |

真模型已接 list／CRUD
的：`AdminUser`／`Auth*`／`Menu`／`AdminSession`／`AdminPasskey`（含账号安全／passkeys）。扫仓结论：**没有「有模型却仍
stub」的页**。

---

## 3) 未完成／仍弱

| 项                              | 状态／注意                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **IM／Chat**                    | `ChatModal` 仅布局壳，**无 IM 后端**；保持诚实空态                                                         |
| **dashboard demo KPI**          | 管理条 live（admins／菜单／角色）；**会员／财务／图表仍 demo**（无 Member／Finance）                       |
| **CMS 叶子**                    | `/cms/article                                                                                              |
| **会员三页**                    | `/user`／`active`／`zombie` — StubList，**无 Member 模型**                                                 |
| **developer 叶子**              | database／feedback／language／system — stub（menus 已 live）                                               |
| **system base·region·datetime** | stub 对稿字段／时钟；**无 Config／Region／setTime API**                                                    |
| **AuthAssignment**              | 无模型；assign 仅 `roleCodes`；allow／deny＋用户直绑路由＝gap UI，**禁假提交**                             |
| **无模型页**                    | 一律 stub + `stub.skeletonHint`；禁止假 list/CRUD                                                          |
| **xlsx OOXML**                  | 无扩展包；DataPanel 浏览器侧 CSV／HTML-as-xls／XML／JSON 等；`panel.xlsxGap`                               |
| **TagView keep-alive**          | **N/A**（SSR 场景不接 Vue 式 keep-alive）                                                                  |
| **forget／reset／captcha**      | **验证码已接通**（登录表单 + 找回密码校验）。**邮件未发**、**重置不写库**（无 mail／token 模型，禁止假接） |

更多页级细节 → `page-migration-matrix.md` §10–§12 与 `handoff.md` §6。

---

## 4) 用户硬约定摘要（续工必须遵守）

1. **对稿**：以 **`/home/vue/dreamer-vue` 全站**为唯一 UI
   参照（壳＋全部菜单页）。
2. **实现栈**：只用 **`@dreamer/view` + `@dreamer/ui-view`**；禁第二套 UI
   库／`ui-preact`／`ui-react`。
3. **星星 icon**：菜单叶子／二级默认 star；SideMenu 对 star／空 icon 按 key
   回落。
4. **菜单结构**：会员三项；系统三项；开发管理（含
   menus）；**勿**统计／财务／问答／问卷。
5. **会员在内容上**：顶层会员管理排在 CMS／内容之上。
6. **禁 CloudAgent**（及同类云端代跑改本任务）。
7. **Git**：本地**英文** commit；已有 origin **勿强推**；**勿自建
   remote**；本停工轮次及未派单前 **勿 push**。
8. **复用 dreamer-jsr 扩展包**（见 `extension-packages.md`）；勿平行重写
   UI／路由／主题框架。
9. **诚实接线**：无模型／API 不造假后端；可留 UI 扩展位并写进 matrix／handoff。
10. **只改本仓** `dweb-admin`；勿碰 `douwanjia`／`senvis`／`quant`／`care-guard`
    等。

---

## 5) 依赖与版本（锁定事实）

| 包                | 版本／约定                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `@dreamer/dweb`   | **^3.7.6**（本仓 `deno.json` 直接锁；解析 **3.7.6**）                                             |
| `@dreamer/server` | **1.2.2**（经 dweb 传递；JSR 已发；workspace 源 `server/deno.json` version 1.2.2）                |
| `apiMode`         | **`"action"`**（backend + api 两应用）                                                            |
| kind:api 前缀     | **无 `/api` 前缀**；根 **`/`** 与 **`/users`** 等缺 method 时回落导出 **`index`**（server 1.2.2） |
| Tailwind          | **^4.1**（`tailwindcss` / `@tailwindcss/postcss`）                                                |
| 视图              | `@dreamer/view` ^2.2；`@dreamer/ui-view` ^1.1.2                                                   |

**停工令：勿升依赖。** 升 JSR 链需用户另派单。

---

## 6) 建议下一刀顺序（续工时）

1. **验证码已接**（2026-11-01
   续工）。下一刀若要找回密码真正可用：先加邮件发送与一次性重置 token 模型，再让
   `/password/reset` 写库。此前保持 `mail: false` 与 reset 演示文案。
2. **真模型优先**：若产品要会员／CMS／系统配置／审计日志 — **先加 Mongo 模型 +
   API**，再换掉 StubList／StubSettings；禁止假接。
3. **AuthAssignment（可选产品需求）**：要 Vue 式 allow／deny＋用户直绑路由 →
   先模型＋API，再接线 Assign gap；否则维持 gap UI。
4. **Dashboard**：有 Member／Finance 后再把 demo KPI／图改 live；此前保持
   demoBadge。
5. **壳层诚实项**：Chat／IM 无后端则继续空态；TagView keep-alive 继续 N/A；xlsx
   等 OOXML 依赖进仓后再接。
6. **对稿抛光**：对照 matrix 把仍「部分」的 live 页（RBAC 列缺口如
   login_count／avatar、Menus 无 component
   字段等）按产品优先级补；**勿改其它产品仓**。
7. **文档**：改进度时同步 `page-migration-matrix.md` + 本文件／`handoff.md`
   修订记录。
8. **Git**：仅本地英文 commit；**未获派单勿 push**；领先 origin
   的提交堆在本地即可。

---

## 续工检查清单（复制即用）

```bash
cd /home/deno/dreamer-jsr/dweb-admin
git log -1 --oneline
git status
git remote -v
git rev-list --left-right --count origin/main...HEAD   # 预期：0 behind，领先 ≥33

# 读文档
# docs/ai-handoff.md → docs/handoff.md → docs/page-migration-matrix.md → docs/extension-packages.md

# 跑起来（按需）
cp -n .env.example .env
deno task mongo:up && deno task seed && deno task dev
```

**一句话**：读完本文即可接手 `dweb-admin`。验证码已接；下一刀是邮件／重置
token，或按 §6 给会员／CMS 加真模型。遵守 §4 硬约定，未派单勿 push。
