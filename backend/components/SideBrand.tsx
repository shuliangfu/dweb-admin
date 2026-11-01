/**
 * Sidebar title row — site name, or the short label when the rail is collapsed.
 */
import { Link } from "@dreamer/ui-view";

export function SideBrand(props: { name: string; short: string }) {
  const mark = [...props.name.trim()][0]?.toUpperCase() || "D";
  return (
    <Link
      href="/"
      data-testid="side-brand"
      class="adm-side-brand flex h-adm-top w-full shrink-0 items-center justify-center px-3 no-underline"
      title={props.name}
    >
      <span class="adm-label w-full truncate text-center text-base font-bold tracking-tight">{props.name}</span>
      <span class="adm-short hidden w-full text-center text-[1.75rem] font-bold leading-none">{mark}</span>
    </Link>
  );
}
