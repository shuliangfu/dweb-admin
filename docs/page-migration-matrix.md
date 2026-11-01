# dreamer-admin ↔ dweb-admin page migration matrix

Generated: 2026-11-01 (Asia/Shanghai) · updated same day (handoff + assign gap UI + DataPanel children/CSV)

## Path note (confirmed)

| Role | Path |
|---|---|
| **Vue admin reference (confirmed)** | `/home/vue/dreamer-vue` |
| **dweb-admin target** | `/home/deno/dreamer-jsr/dweb-admin` (admin UI in **`backend/`**; `frontend/` / `mobile/` are separate consumer apps) |

Historical dispatch alias `dreamer-admin` resolves to `/home/vue/dreamer-vue` (package `dreamer`, remote `git@git.shuliangfu.com:dreamer-vue.git`). There is no separate `/home/vue/dreamer-admin` tree on this machine.

**Successor handoff:** `docs/handoff.md` (项目说明、栈、跑法、硬规则、进度).

Status legend: **已有** = present and usable · **部分** = exists but not aligned to Vue look/IA · **缺** = missing

---

## 0. Shared list chrome (数据面板)

Vue lists almost all use one wrapper:

| Vue name | Path | Role |
|---|---|---|
| `CardPanel` | `/home/vue/dreamer-vue/src/components/Card/CardPanel.vue` | 「数据面板／数据展示面板」: title, tools (create/search/refresh/print/import/export/columns), search schemas, table columns, row actions, pagination; driven by `{ store, table, search, form? }` |
| `CardList` | `.../Card/CardList.vue` | Panel chrome / card frame used by CardPanel |
| `CardView` | `.../Card/CardView.vue` | Related card view |
| Table helpers | `.../components/Table/*` | Sort cells/headers |

dweb-admin today:

| Piece | Path | Status |
|---|---|---|
| Page-level CRUD admins | `backend/components/*Admin.tsx`, `crud-kit.tsx` | **部分** — per-page UI, not a reusable CardPanel |
| ui-view Table/Card/List/Pagination/Modal | via `@dreamer/ui-view` | **已有** (library) |
| Callable `DataPanel` / `CardPanel` in `common/components/` | `common/components/DataPanel.tsx` | **部分** — search/column/CSV export+import(`parseCsv`→`onImportRows`)/print; `children` ctx.`filterTableColumns` hides cols; Excel/XML/HTML unavailable without pkgs; wired on model lists + stubs |

**Target:** `common/components/DataPanel.tsx` (name TBD) composed from `@dreamer/ui-view` only; all list pages consume it.

---

## 1. Shell layer（壳层 · 与内容页同等优先级）

Vue shell composition (`Layout.vue`):

```
el-aside → Side (logo + el-menu)
el-header.header-t → TopHeader (collapse, breadcrumb, user, chat, lang, theme, fullscreen, settings)
el-header.header-x → SecondHeader → TagView (multi-tab)
el-main → router-view
```

| Shell piece | Vue path / components | Vue behavior | dweb-admin path | Status | Gap |
|---|---|---|---|---|---|
| App HTML shell | `index.html` + Vue app | title, root mount | `backend/routes/_app.tsx` | **部分** | OK structurally; branding/title still “Dweb Admin” |
| Layout frame | `src/components/Layout/Layout.vue` | side + dual headers + main; mobile drawer | `backend/routes/_layout.tsx` | **部分** | Vue grid + mobile drawer; lock/chat/settings wired into chrome (minimal). Theme primary presets + ColorPicker in SettingsDrawer |
| Sidebar / 左侧菜单 | `Layout/Side/Side.vue` + `Side/Item.vue` | logo「浮生若梦」, collapse, `el-menu` from `routeStore.routes` | `SideBrand.tsx` + `SideMenu.tsx` + menu DB | **部分** | Logo strip + key→icon map + collapse icon centering; DB menu retained; not full Vue m-icon set |
| Top bar / 顶部栏 | `Layout/TopHeader/TopHeader.vue` (+ `modules/Profile.vue`, `UpdatePassword.vue`, `UpdateProfile.vue`) | collapse control, breadcrumb, avatar menu (profile/password/lock/logout), chat, language, theme, fullscreen, settings drawer | `TopHeader.tsx` + Lang/Theme/User + FullscreenToggle + ChatModal + SettingsDrawer | **部分** | Breadcrumb toggle, lock entry, chat stub, settings drawer (breadcrumb switch); primary color presets + ColorPicker in settings |
| Second header / Tag tabs | `Layout/SecondHeader/SecondHeader.vue` → `TagView/*` | multi-tab visited pages | `backend/components/TagView.tsx` | **部分** | Tabs + localStorage + close/context actions; keep-alive page cache not applicable (SSR/view) |
| Mobile side drawer | `Layout.vue` `el-drawer` | drawer when mobile | `_layout.tsx` backdrop + `SidebarToggle` | **部分** | Full-height drawer + backdrop aligned with Vue aside drawer |
| Login / no-chrome | `views/fullpage/*` rendered outside Layout | fullpage | `_layout.tsx` skips `/login`, `/password/*`, `/error/*` | **已有** | forget/reset + error pages use AuthShell/ErrorPage |

### Shell cut order (recommended)

1. **Layout frame** — restyle `_layout.tsx` to Vue grid: left logo+menu, top TopHeader, second TagView row, content.
2. **SideMenu** — align logo/title, icons, active/collapse with `Side.vue` / `Item.vue`; keep DB menu source.
3. **TopHeader** — breadcrumb (`@dreamer/ui-view` Breadcrumb), user dropdown parity, lang/theme/fullscreen placements.
4. **TagView** — new common/backend component (缺); then wire into layout.
5. Only then content pages (so lists sit in correct chrome).

Blocking relation: **TagView + TopHeader breadcrumb** are pure shell; list `DataPanel` can start in parallel after step 1–2, but page polish waits on shell.

---

## 2. Auth / fullpage / error

| Vue route (typical) | Vue file | Title / notes | dweb-admin | Status |
|---|---|---|---|---|
| `/login` | `fullpage/login.vue` | 登录 | `backend/routes/login.tsx` | **部分** |
| `/lock` | `fullpage/lock.vue` | 锁屏 | `backend/routes/lock.tsx` + `/api/auth/unlock` | **部分** — clock/avatar/password; cookie gate |
| `/password/forget` | `fullpage/password/forget.vue` | 找回密码 | `backend/routes/password/forget.tsx` + `AuthShell` | **部分** — UI stub (captcha/mail not wired) |
| `/password/reset` | `fullpage/password/reset.vue` | 重置密码 | `backend/routes/password/reset.tsx` + `AuthShell` | **部分** — UI stub (not persisted) |
| `/error/403` | `error/403.vue` | 403 | `backend/routes/error/403.tsx` + `ErrorPage`; guard → `/error/403` | **部分** |
| `/error/404` | `error/404.vue` | 404 | `backend/routes/error/404.tsx` + `_404.tsx` | **部分** |
| `/error/500` | `error/500.vue` | 500 | `backend/routes/error/500.tsx` + `_error.tsx` | **部分** |

---

## 3. Home

| Vue route | Vue file | dweb-admin | Status |
|---|---|---|---|
| `/dashboard` | `home/dashboard.vue` | `backend/routes/index.tsx` (`/`) | **部分** — KPI + ChartLine/Bar/Doughnut via ui-view; demo series |
| `/workspace` | `home/workplace.vue` | `backend/routes/workspace.tsx` | **部分** — button playground stub |

---

## 4. Admin / RBAC（Vue `admin/*` ↔ dweb `rbac/*`）

| Vue file | Title | Suggested dweb route | dweb file | Status |
|---|---|---|---|---|
| `admin/index.vue` | 管理员列表 | `/rbac/admins` | `AdminsAdmin.tsx` + real `/api/users` | **部分** — DataPanel + export/print/column; live list |
| `admin/role/index.vue` | 角色列表 | `/rbac/roles` | `ItemAdmin.tsx` + real RBAC APIs | **部分** — DataPanel tools + Transfer children |
| `admin/access/index.vue` | 权限列表 | `/rbac/permissions` | `ItemAdmin.tsx` + real RBAC APIs | **部分** — DataPanel tools + Transfer children |
| `admin/route/index.vue` | 路由列表 | `/rbac/routes` | `RoutesAdmin.tsx` + real route registry APIs | **部分** — Transfer + print |
| `admin/assign/index.vue` | 权限分配 | `/rbac/assign` | `AssignAdmin.tsx` + Transfer → `PUT /api/users/:id` roleCodes | **部分** — roles=allow runnable; modal has disabled allow/deny + direct-route gap UI (documented; no fake API) |

---

## 5. System

| Vue file | Title | dweb-admin | Status |
|---|---|---|---|
| `developer/menu/index.vue` | 菜单列表 | `/system/menus` → `MenusAdmin.tsx` + real menu APIs | **部分** — DataPanel search/export/print/column |
| `system/admin-log/index.vue` | 管理员日志列表 | `/system/admin-log` stub DataPanel | **部分** — demo rows |
| `system/base/index.vue` | 基本设置 | `/system/base` stub Descriptions | **部分** — settings preview |
| `system/bonus/index.vue` | 奖金设置 | `/system/bonus` stub Descriptions | **部分** — settings preview |
| `system/datetime/index.vue` | 时间设置 | `/system/datetime` stub Descriptions | **部分** — settings preview |
| `system/express/index.vue` | 快递公司列表 | `/system/express` stub DataPanel | **部分** — demo rows |
| `system/finance/index.vue` | 财务设置 | `/system/finance` stub Descriptions | **部分** — settings preview |
| `system/level/index.vue` | 会员级别列表 | `/system/level` stub DataPanel | **部分** — demo rows |
| `system/locale/index.vue` | 本地化管理 | `/system/locale` stub DataPanel | **部分** — demo rows |
| `system/online/index.vue` | 在线管理员 | `/system/online` → `OnlineAdmin.tsx` (DataPanel + real AdminSession) | **部分** — live sessions; IP/UA N/A; search/export/print/column |
| `system/region/index.vue` | 地区列表 | `/system/region` stub DataPanel | **部分** — demo rows |
| `system/transfer/index.vue` | 转账设置 | `/system/transfer` stub Descriptions | **部分** — settings preview |
| `system/wallet/index.vue` | 钱包设置 | `/system/wallet` stub Descriptions | **部分** — settings preview |

---

## 6. User（会员）

All **部分** as catalog-driven stubs (`common/stubs/catalog.ts` + DataPanel / chart placeholder); no domain models yet:

| Vue file | Title | dweb-admin | Status |
|---|---|---|---|
| `user/index.vue` | 会员列表 | `/user` | **部分** — demo DataPanel |
| `user/new.vue` | 新增会员 | `/user/new` | **部分** — demo DataPanel |
| `user/active.vue` | 活跃会员 | `/user/active` | **部分** — demo DataPanel |
| `user/black.vue` | 黑名单会员 | `/user/black` | **部分** — demo DataPanel |
| `user/locked.vue` | 锁定会员 | `/user/locked` | **部分** — demo DataPanel |
| `user/zombie.vue` | 僵尸会员 | `/user/zombie` | **部分** — demo DataPanel |
| `user/online/index.vue` | 在线会员 | `/user/online` | **部分** — demo DataPanel |
| `user/log/index.vue` | 会员日志列表 | `/user/log` | **部分** — demo DataPanel |
| `user/receipt/index.vue` | 收款方式列表 | `/user/receipt` | **部分** — demo DataPanel |
| `user/upgrade-log/index.vue` | 升级记录列表 | `/user/upgrade-log` | **部分** — demo DataPanel |
| `user/location/index.vue` | 会员分布图 | `/user/location` | **部分** — chart placeholder |
| `user/path-invite/index.vue` | 推荐图 | `/user/path-invite` | **部分** — chart placeholder |
| `user/path-position/index.vue` | 安置图 | `/user/path-position` | **部分** — chart placeholder |

---

## 7. CMS

All **部分** stubs (DataPanel demo): `/cms/article|news|notice|photo|qa|survey`.

---

## 8. Finance

All **部分** stubs (DataPanel demo): `/finance/bonus` (+`/log`), `/invest`, `/point`, `/recharge`, `/wallet` (+`/add-sub`, `/log`), `/withdraw`.

---

## 9. Count（统计）

All **部分** stubs (DataPanel demo): `/count/bonus|invest|point|recharge|withdraw`.

---

## 10. Developer

| Vue file | Title | dweb-admin | Status |
|---|---|---|---|
| `developer/menu/index.vue` | 菜单列表 | see System `/system/menus` | **部分** (path remap) |
| `developer/database/index.vue` | 数据备份列表 | `/developer/database` stub | **部分** — demo DataPanel |
| `developer/feedback/index.vue` | 问题反馈列表 | `/developer/feedback` stub | **部分** — demo DataPanel |
| `developer/language/index.vue` | 系统语言列表 | `/developer/language` stub | **部分** — demo DataPanel |
| `developer/system/index.vue` | 系统日志列表 | `/developer/system` stub | **部分** — demo DataPanel |

---

## 11. Counts summary

| Area | Vue pages (excl. modules) | dweb 已有/部分 | 缺 |
|---|---:|---:|---:|
| Shell pieces (layout/side/top/second/tag) | 5+ | 5 部分 | TagView keep-alive N/A; chat still stub |
| Fullpage + error | 7 | 7 部分 (login/lock/forget/reset/403/404/500) | 0 (parity pending) |
| Home | 2 | 2 部分 (dashboard charts + workspace stub) | 0 |
| Admin/RBAC | 5 | 5 部分 (incl. `/rbac/assign`) | 0 (allow/deny model still absent; gap UI only) |
| System + developer menu | 13 | 13 部分 (menus/online + 11 stubs) | 0 (model/API pending) |
| User | 13 | 13 部分 (stubs) | 0 (model/API pending) |
| CMS | 6 | 6 部分 (stubs) | 0 (model/API pending) |
| Finance | 9 | 9 部分 (stubs incl. bonus/log + wallet add-sub/log) | 0 (model/API pending) |
| Count | 5 | 5 部分 (stubs) | 0 (model/API pending) |
| Developer (rest) | 4 | 4 部分 (stubs) | 0 (model/API pending) |
| **DataPanel wrapper** | 1 (CardPanel) | 1 部分 (search/column/CSV export+import/print; children col filter) | Excel/XML/HTML backends pending (no pkgs) |

Vue list entry pages: **64** view files (modules excluded). Dynamic sidebar routes beyond static `/dashboard`/`/workspace`/auth come from backend-fed `routeStore` in Vue; dweb uses Mongo `menus` seed covering dashboard/workspace/rbac/system/user/cms/finance/count/developer (stub leaves included).

---

## 12. Suggested implementation order (next knives)

1. Replace stubs with real models/APIs (system settings store, member, CMS, finance). No remaining *model-backed* demo lists — AdminUser/Auth*/Menu/Session already live.
2. DataPanel: Excel/XML/HTML only after adding real deps; row-level forms / CardPanel store parity.
3. If product needs Vue allow/deny + user-direct routes: add AuthAssignment-class model + API first, then wire the reserved Assign gap panel (do not fake).
4. Done recently: `/rbac/assign` roleCodes + gap UI; DataPanel CSV import parse + children `filterTableColumns` on admins/roles/menus; theme primary; AUTH_ONLY tighten; `docs/handoff.md`.
5. Handoff for successors: `docs/handoff.md` (Chinese).

### Hard constraints reminder

- Rewrite with `@dreamer/view` + `@dreamer/ui-view` only; no second component library.
- Touch **only** `dweb-admin` (this repo).
