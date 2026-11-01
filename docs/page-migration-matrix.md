# dreamer-admin ↔ dweb-admin page migration matrix

> **API (2026-11-01):** apps use `apiMode: "action"` (see `docs/handoff.md`). On dweb 3.7.5, kind:api bare `/` does **not** auto-run `index` — use `/index`.

Generated: 2026-11-01 (Asia/Shanghai) · updated: admins/roles Vue columns; CMS/member skeleton handoff; dashboard live vs demo

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
| Callable `DataPanel` / `CardPanel` in `common/components/` | `common/components/DataPanel.tsx` | **部分** — search/column/multi-format export (CSV/HTML-as-xls/XML/TXT/JSON)+import/print/icon toolbar; `filterTableColumns`; no dreamer-jsr OOXML/xlsx pkg — HTML-as-xls only; wired on model lists + stubs |

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
| Sidebar / 左侧菜单 | `Layout/Side/Side.vue` + `Side/Item.vue` | logo「浮生若梦」, collapse, `el-menu` from `routeStore.routes` | `SideBrand.tsx` + `SideMenu.tsx` + menu DB | **部分** | Logo strip + ICON_BY_KEY + collapse; margin-top 15px; **unique-opened** via details; no Vue m-icon font |
| Top bar / 顶部栏 | `Layout/TopHeader/TopHeader.vue` (+ `modules/Profile.vue`, `UpdatePassword.vue`, `UpdateProfile.vue`) | collapse control, breadcrumb, avatar menu (profile/password/lock/logout), chat, language, theme, fullscreen, settings drawer | `TopHeader.tsx` + Lang/Theme/User + FullscreenToggle + ChatModal + SettingsDrawer | **部分** | Settings 400; breadcrumb + primary + **theme.other→`--adm-*` subset** + semantic colors; dialog/card tokens handoff |
| Second header / Tag tabs | `Layout/SecondHeader/SecondHeader.vue` → `TagView/*` | multi-tab visited pages | `backend/components/TagView.tsx` | **部分** | Tabs + localStorage + close/context; active border-bottom none; keep-alive N/A (SSR) |
| Mobile side drawer | `Layout.vue` `el-drawer` | drawer when mobile | `_layout.tsx` backdrop + `SidebarToggle` | **部分** | Full-height drawer + backdrop aligned with Vue aside drawer |
| Login / no-chrome | `views/fullpage/*` rendered outside Layout | fullpage | `_layout.tsx` skips `/login`, `/password/*`, `/error/*` | **已有** | forget/reset + error pages use AuthShell/ErrorPage |

### Shell cut order (recommended)

1. **Layout frame** — restyle `_layout.tsx` to Vue grid: left logo+menu, top TopHeader, second TagView row, content.
2. **SideMenu** — unique-opened + ICON_BY_KEY done; remaining: full m-icon parity N/A (ui-view only).
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
| `/dashboard` | `home/dashboard.vue` | `backend/routes/index.tsx` (`/`) | **部分** — live admin strip (AdminUser/menus/roles); member/finance/charts DEMO (handoff) |
| `/workspace` | `home/workplace.vue` | `backend/routes/workspace.tsx` | **部分** — button playground stub |

---

## 4. Admin / RBAC（Vue `admin/*` ↔ dweb `rbac/*`）

| Vue file | Title | Suggested dweb route | dweb file | Status |
|---|---|---|---|---|
| `admin/index.vue` | 管理员列表 | `/rbac/admins` | `AdminsAdmin.tsx` + real `/api/users` | **部分** — DataPanel + export/print/column; live list |
| `admin/role/index.vue` | 角色列表 | `/rbac/roles` | `ItemAdmin.tsx` + real RBAC APIs | **部分** — DataPanel tools + Transfer children |
| `admin/access/index.vue` | 权限列表 | `/rbac/permissions` | `ItemAdmin.tsx` + real RBAC APIs | **部分** — DataPanel tools + Transfer children |
| `admin/route/index.vue` | 路由列表 | `/rbac/routes` | `RoutesAdmin.tsx` + real route registry APIs | **部分** — Transfer + managed table (path/method/source/createdAt; no AuthRoute.name) |
| `admin/assign/index.vue` | 权限分配 | `/rbac/assign` | `AssignAdmin.tsx` + Transfer → `PUT /api/users/:id` roleCodes | **部分** — list cols #/username/access/actions; roles=allow runnable; gap UI for AuthAssignment (no fake API) |

---

## 5. System

Kept under 系统管理 (3 stubs only):

| Vue file | Title | dweb-admin | Status |
|---|---|---|---|
| `system/base/index.vue` | 基本设置 | `/system/base` StubSettings | **部分** — Vue field order (site/company/captcha/formats/locale/pageSize); no Config API |
| `system/region/index.vue` | 地区列表 | `/system/region` StubList | **部分** — cols name/pname/level + search gid/pid/name/level; no Region model |
| `system/datetime/index.vue` | 时间设置 | `/system/datetime` StubDatetime | **部分** — digital clock + tz/offset demo; no setTime/sync API |

Removed from 系统管理 (no menu/route/stub here): menus (moved → 开发管理), online, admin-log, express, level, locale, bonus, finance, transfer, wallet.

---

## 6. User（会员）

Keep only three catalog stubs (DataPanel demo); no domain models yet:

| Vue file | Title | dweb-admin | Status |
|---|---|---|---|
| `user/index.vue` | 会员列表 | `/user` | **部分** — skeleton StubList（无 Member 模型；handoff） |
| `user/active.vue` | 活跃会员 | `/user/active` | **部分** — skeleton StubList（无 Member 模型；handoff） |
| `user/zombie.vue` | 僵尸会员 | `/user/zombie` | **部分** — skeleton StubList（无 Member 模型；handoff） |

Removed from dweb-admin (no route/menu/stub): new / black / locked / online / log / receipt / upgrade-log / location / path-invite / path-position.

---

## 7. CMS

All **部分** skeleton stubs (no Cms* models; StubList + handoff): `/cms/article|news|notice|photo`. Removed: qa / survey.

---

## 8. Developer（开发管理）

Top-level title 开发管理. Menus live page moved here; other leaves stay stubs:

| Vue file | Title | dweb-admin | Status |
|---|---|---|---|
| `developer/menu/index.vue` | 菜单管理 | `/developer/menus` → `MenusAdmin.tsx` + real menu APIs | **部分** — cols title/parent/path/icon/sort/visible(+key); search key/path; no component/show |
| `developer/database/index.vue` | 数据备份列表 | `/developer/database` stub | **部分** — demo DataPanel |
| `developer/feedback/index.vue` | 问题反馈列表 | `/developer/feedback` stub | **部分** — demo DataPanel |
| `developer/language/index.vue` | 系统语言列表 | `/developer/language` stub | **部分** — demo DataPanel |
| `developer/system/index.vue` | 系统日志列表 | `/developer/system` stub | **部分** — demo DataPanel |

---

## 9. Counts summary

| Area | Vue pages (excl. modules) | dweb 已有/部分 | 缺 |
|---|---:|---:|---:|
| Shell pieces (layout/side/top/second/tag) | 5+ | 5 部分 | TagView keep-alive N/A; chat = layout-only shell (no IM) |
| Fullpage + error | 7 | 7 部分 (login/lock/forget/reset/403/404/500) | 0 (parity pending) |
| Home | 2 | 2 部分 (dashboard charts + workspace stub) | 0 |
| Admin/RBAC | 5 | 5 部分 (incl. `/rbac/assign`) | 0 (allow/deny model still absent; gap UI only) |
| System | 3 kept | 3 部分 (stubs) | extras dropped from 系统管理 |
| Developer（开发管理） | 5 | 5 部分 (menus live + 4 stubs) | online removed from nav |
| User | 3 kept | 3 部分 (stubs) | Vue extras intentionally dropped |
| CMS | 4 kept | 4 部分 (stubs) | qa/survey dropped |
| Developer (rest) | 4 | 4 部分 (stubs) | 0 (model/API pending) |
| **DataPanel wrapper** | 1 (CardPanel) | 1 部分 (search/column/CSV export+import/print; children col filter) | Excel/XML/HTML backends pending (no pkgs) |

Vue list entry pages: **64** view files (modules excluded). Dynamic sidebar routes beyond static `/dashboard`/`/workspace`/auth come from backend-fed `routeStore` in Vue; dweb uses Mongo `menus` seed covering dashboard/workspace/rbac/user(3)/cms/system(3)/developer(开发管理: menus+4 stubs). Top-level sort: user above cms. Finance/count removed.

---

## 10. Suggested implementation order (next knives)

1. **Model-backed scan (2026-11-01):** Mongo models in-tree are only `AdminUser` / `Auth*` / `Menu` / `AdminSession` / `AdminPasskey` (+ challenges). Every list that can use those models is already live (admins, assign, roles, permissions, routes, menus, online+kick, account security/passkeys). **No remaining model-backed stub pages.** Remaining system(3)/user(3)/CMS/developer stub leaves stay stubs until new domain models exist — do not fake APIs. Finance/count removed; menus live at `/developer/menus`.
2. Next real work needs **new models** (member, CMS, system settings store, admin audit log) or Vue-parity polish on existing live pages (DataPanel Excel/XML once deps land; TagView keep-alive N/A on SSR).
3. Shell: ChatModal is layout-only (no IM backend); keep honest empty states.
4. If product needs Vue allow/deny + user-direct routes: add AuthAssignment-class model + API first, then wire the reserved Assign gap panel (do not fake).
5. Kept member(3) / CMS as skeleton StubList (Vue columns/search; stub.skeletonHint; no domain models — do not fake APIs).
6. Admins/Roles list columns re-aligned to Vue (2026-11-01); dashboard live admin strip vs demo member/finance KPIs documented in handoff.
5. Done recently: Tailwind 4 arbitrary-size cleanup; session IP/UA; online kick (`DELETE /api/sessions/:id`); ChatModal split shell; assign gap UI; DataPanel CSV import + `filterTableColumns`; `docs/handoff.md`.

### Hard constraints reminder

- Rewrite with `@dreamer/view` + `@dreamer/ui-view` only; no second component library.
- Touch **only** `dweb-admin` (this repo).
