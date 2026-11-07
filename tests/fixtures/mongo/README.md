# Mongo CI fixtures (sanitized)

Collections restored by CI via `mongorestore --drop` before backend start:

- `admin_users` — test admin only (`SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD`, default `admin`/`admin888`); no TOTP pending/secret, no passkey fields
- `menus`
- `auth_items`
- `auth_routes`
- `auth_item_children`
- `site_settings`

Regenerate on a machine with Mongo:

```bash
deno task fixture:mongo
```
