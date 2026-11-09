/** Glue for resource pages: SSR first paint (loadPanel) + the generic DataPanel. */
import { type Locale } from "@common/i18n/mod.ts";
import { DataPanel, type PanelInitial } from "@common/components/DataPanel.tsx";
import { resourcePanelActions } from "@common/hook/panel-actions.ts";

export type ResData = { locale?: Locale; initial?: PanelInitial };

export function ResPage(props: { data?: ResData } & ResData) {
  const d: ResData = props.data ?? props;
  if (!d.initial) return null;
  const actions = resourcePanelActions(d.initial.meta.key);
  return (
    <DataPanel
      initial={d.initial}
      locale={d.locale ?? "zh-CN"}
      toolbar={actions.toolbar}
      rowActions={actions.rowActions}
    />
  );
}
