# dreamer-jsr extension / workspace packages (scan 2026-11-01)

Source root: `/home/deno/dreamer-jsr`. Confirmed Vue admin reference: `/home/vue/dreamer-vue`. Skipped product apps: `douwanjia`, `senvis`, `quant`, `care-guard` (out of admin-template scope).

## Useful for dweb-admin UI / lists / panels (priority)

| Package dir | JSR name | Role for admin rewrite |
|---|---|---|
| `view` | `@dreamer/view` | Fine-grained reactive UI (JSX). **Required** runtime for all pages. Already in `deno.json`. |
| `ui-view` | `@dreamer/ui-view` | Desktop/mobile component library (Tailwind v4). Exports `./data-display` (Table, Card, List, Empty…), `./layout`, `./navigation` (Menu, Sidebar, Breadcrumb, Pagination, PageHeader…), `./form`, `./feedback` (Modal, message…). **Primary building blocks** for shell + CardPanel rewrite. Already imported. |
| `theme` | `@dreamer/theme` | Light/dark theme injection. Already in imports; used by shell ThemeMenu. |
| `i18n` | `@dreamer/i18n` | Locale helpers. Already in imports. |
| `dweb` | `@dreamer/dweb` | Full-stack app framework (routes, load, SSR/CSR). Hosts backend admin. |
| `render` | `@dreamer/render` | SSR/CSR/hydration for View. Via dweb. |
| `router` | `@dreamer/router` | Routing. Via dweb. |
| `plugins` | `@dreamer/plugins` | Official dweb plugins (incl. ui-view plugin wiring). |
| `middlewares` | `@dreamer/middlewares` | HTTP middleware; auth/RBAC guard path. |
| `database` | `@dreamer/database` | Models for menus/admins/RBAC. Already used. |
| `cache` | `@dreamer/cache` | Session/cache helpers. Already imported. |
| `humancheck` | `@dreamer/humancheck` | CAPTCHA / TOTP helpers (login/security). Already imported. |

### ui-view modules most relevant to 「数据面板」

- `@dreamer/ui-view/data-display` → `Table`, `Card`, `List`, `Empty`, `Tag`, `Descriptions`, …
- `@dreamer/ui-view` form → `Search`, `Input`, `Select`, `DatePicker`, …
- `@dreamer/ui-view` navigation → `Pagination`, `Menu`, `Sidebar`, `Breadcrumb`, `PageHeader`
- `@dreamer/ui-view` feedback → `Modal`, `Drawer`, `message`, `Dropdown`-adjacent patterns
- **No** dedicated `CardPanel` / `DataPanel` export today → wrap in `dweb-admin/common/components/` reusing the above (do **not** fork a second UI kit).

## Other workspace packages (lower priority / infra)

`auth`, `session`, `service`, `server`, `logger`, `utils`, `config`, `console`, `crypto`, `email`, `notification`, `storage`, `upload`, `queue`, `stream`, `socket-io`, `websocket`, `webrtc`, `image`, `video`, `video-player`, `markdown`, `esbuild`, `runtime-adapter`, `lifecycle`, `plugin`, `test`, `payment`, `web3`, `foundry`, `ui-preact`, `ui-react`.

Notes:

- Prefer **ui-view** over ui-preact/ui-react for this admin (View JSX).
- Do not re-implement Table/Card/Menu; compose them into admin-level `DataPanel` / shell.
