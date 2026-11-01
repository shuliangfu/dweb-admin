/**
 * Sidebar logo strip — Vue Side.vue title row (icon + app name).
 */
import { Link } from "@dreamer/ui-view";

export function SideBrand(props: { name: string; short: string }) {
  return (
    <Link
      href="/"
      data-testid="side-brand"
      class="adm-side-brand flex h-[56px] shrink-0 items-center justify-center gap-2 px-3 no-underline"
      title={props.name}
    >
      <img src="/assets/favicon.svg" alt="" class="h-8 w-8 shrink-0" width="32" height="32" />
      <span class="adm-label truncate text-base font-bold tracking-tight">{props.name}</span>
      <span class="adm-short hidden text-base font-bold">{props.short.slice(0, 1).toUpperCase()}</span>
    </Link>
  );
}
