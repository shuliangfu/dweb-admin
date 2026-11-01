/** Shared styling for top-bar dropdown menus (ui-view Dropdown overlays). */
export const itemCls =
  "flex w-full min-w-37.5 cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700";

/** Trigger on light TopHeader (Vue header-t), not the old AdminLTE blue bar. */
export const triggerCls =
  "inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700";

/**
 * ui-view's Dropdown stays open after an item inside its overlay is clicked (it only closes on
 * an outside click / Esc). Items call this to close it via the library's own outside-click path.
 */
export function closeMenus(): void {
  setTimeout(() => (globalThis as unknown as { document?: { body: { click: () => void } } }).document?.body.click(), 0);
}
