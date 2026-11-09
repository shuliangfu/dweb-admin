/**
 * Admin ↔ role assignment. Server-driven list (resource "assign"); the Modal holds a Transfer of
 * roles and persists through the shared user-update API.
 */
import { createSignal } from "@dreamer/view";
import { Button, Modal, Tag, Transfer } from "@dreamer/ui-view";
import { can } from "@common/hook/can.ts";
import { capGate } from "@common/hook/panel-actions.ts";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel, type PanelInitial, refreshPanel } from "@common/components/DataPanel.tsx";
import type { Row } from "@common/resources/types.ts";

export type AssignRoleOpt = { name: string; description: string };

const open = createSignal(false);
const current = createSignal<Row | null>(null);
const targetKeys = createSignal<string[]>([]);
const busy = createSignal(false);

export function AssignAdmin(props: { locale: Locale; initial: PanelInitial; roles: AssignRoleOpt[] }) {
  const tr = createT(props.locale);

  function openAssign(row: Row) {
    current.value = row;
    targetKeys.value = [...((row.roleCodes as string[]) ?? [])];
    open.value = true;
  }

  async function save() {
    const row = current.value;
    if (!row || busy.value) return;
    busy.value = true;
    const r = await api("POST", `/api/users/${row.id}/update`, { roleCodes: targetKeys.value });
    busy.value = false;
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) {
      open.value = false;
      await refreshPanel(props.initial.meta.key);
    }
  }

  return (
    <DataPanel
      initial={props.initial}
      locale={props.locale}
      toolbar={{
        create: false,
        import: false,
        export: capGate(can("admin.view") || can("admin.write")),
      }}
      rowActions={{
        view: false,
        edit: false,
        remove: false,
        assign: {
          label: tr("rbac.assign"),
          show: can("admin.write"),
          action: (row) => openAssign(row),
        },
      }}
      renderCell={{
        roleCodes: (row) => (
          <span class="flex flex-wrap gap-1">
            {((row.roleCodes as string[]) ?? []).length
              ? (row.roleCodes as string[]).map((c) => <Tag size="xs" variant="success">{c}</Tag>)
              : <span class="text-xs text-slate-400">—</span>}
          </span>
        ),
      }}
    >
      <Modal
        open={open}
        title={() => tr("assign.modalTitle", { name: String(current.value?.username ?? "") })}
        width="xl"
        keyboard
        destroyOnClose
        onClose={() => {
          open.value = false;
        }}
      >
        <form
          class="grid gap-4"
          onSubmit={(e: Event) => {
            e.preventDefault();
            void save();
          }}
        >
          <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{tr("assign.hint")}</p>
          <Transfer
            dataSource={props.roles.map((r) => ({ key: r.name, title: r.description ? `${r.name} · ${r.description}` : r.name }))}
            targetKeys={targetKeys}
            showSearch
            titles={[tr("rbac.available"), tr("rbac.assigned")]}
            searchPlaceholder={[tr("rbac.transferSearch"), tr("rbac.transferSearch")]}
            listStyle={{ width: 300, height: 280 }}
            onChange={(next: string[]) => {
              targetKeys.value = next;
            }}
            messages={{ count: (n: number) => `${n}`, selectedSuffix: (n: number) => ` / ${n}` }}
          />
          {/* AuthAssignment / deny / user-direct routes: not modeled — placeholder only, no POST. */}
          <aside
            class="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400"
            data-testid="assign-gap"
          >
            <div class="mb-1 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <span>{tr("assign.gapTitle")}</span>
              <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                {tr("assign.gapBadge")}
              </span>
            </div>
            <p class="m-0 leading-relaxed">{tr("assign.gapBody")}</p>
          </aside>
          <div class="flex justify-end gap-2">
            <Button type="button" onClick={() => (open.value = false)}>{tr("crud.cancel")}</Button>
            <Button type="submit" variant="primary" loading={busy.value} data-testid="assign-save">{tr("crud.confirm")}</Button>
          </div>
        </form>
      </Modal>
    </DataPanel>
  );
}
