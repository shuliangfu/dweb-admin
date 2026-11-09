/**
 * Menus admin: list defaults to top-level; click title drills into children (URL ?parentKey=).
 * Same Mongo `menus` source as SideMenu.
 */
import { Button, Breadcrumb, Link, Badge } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { DataPanel, type PanelInitial } from "@common/components/DataPanel.tsx";
import { resourcePanelActions } from "@common/hook/panel-actions.ts";
import type { Row } from "@common/resources/types.ts";

function goMenus(parentKey?: string): void {
  const g = globalThis as unknown as { location?: { assign: (u: string) => void } };
  if (!g.location?.assign) return;
  const q = parentKey ? `?parentKey=${encodeURIComponent(parentKey)}` : "";
  g.location.assign(`/developer/menus${q}`);
}

export function MenusAdmin(props: { locale: Locale; initial: PanelInitial }) {
  const tr = createT(props.locale);
  const parentKey = props.initial.query.filters.parentKey ?? "";
  const actions = resourcePanelActions(props.initial.meta.key);

  const leading = parentKey
    ? (
      <div class="mb-2 flex min-w-0 flex-wrap items-center gap-3" data-testid="menus-drill">
        <Breadcrumb
          items={[
            {
              label: tr("menus.title"),
              onClick: (e: Event) => {
                e.preventDefault();
                goMenus();
              },
            },
          ]}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-testid="menus-back-top"
          onClick={() => goMenus()}
        >
          {tr("menus.backTop")}
        </Button>
      </div>
    )
    : (
      <span
        class="mb-2 block text-xs text-slate-500 dark:text-slate-400"
        data-testid="menus-top-hint"
      >
        {tr("menus.topHint")}
      </span>
    );

  return (
    <div class="flex min-w-0 flex-col">
      {leading}
      <DataPanel
        initial={props.initial}
        locale={props.locale}
        toolbar={actions.toolbar}
        rowActions={actions.rowActions}
        renderCell={{
          title: (row: Row) => {
            const label = String(row.title ?? "");
            const n = Number(row.childCount ?? 0);
            // Only top-level rows with children: title navigates into that level.
            const canDrill = !row.parentKey && n > 0;
            if (!canDrill) return label;
            const href = `/developer/menus?parentKey=${encodeURIComponent(String(row.key))}`;
            return (
              <span class="inline-flex min-w-0 items-center gap-2" data-testid="menus-enter-title">
                <Link
                  href={href}
                  underline
                  class="cursor-pointer font-medium"
                  title={tr("menus.enterTitle")}
                  onClick={(e: Event) => {
                    e.preventDefault();
                    goMenus(String(row.key));
                  }}
                >
                  {label}
                </Link>
                <Badge size="xs" variant="ghost" count={n} />
              </span>
            );
          },
        }}
      />
    </div>
  );
}

export default MenusAdmin;
