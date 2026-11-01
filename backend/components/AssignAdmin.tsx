/**
 * Admin ↔ role assignment. Server-driven list (resource "assign"); the Modal holds a Transfer of
 * roles and persists through the shared user-update API.
 */
import { createSignal } from "@dreamer/view";
import { Button, Modal, Tag, Transfer } from "@dreamer/ui-view";
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
      renderCell={{
        roleCodes: (row) => (
          <span class="flex flex-wrap gap-1">
            {((row.roleCodes as string[]) ?? []).length
              ? (row.roleCodes as string[]).map((c) => <Tag size="xs" variant="success">{c}</Tag>)
              : <span class="text-xs text-slate-400">—</span>}
          </span>
        ),
      }}
      rowExtra={(row) => (
        <Button type="button" size="sm" data-testid="assign-open" onClick={() => openAssign(row)}>
          {tr("rbac.assign")}
        </Button>
      )}
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
          <div class="flex justify-end gap-2">
            <Button type="button" onClick={() => (open.value = false)}>{tr("crud.cancel")}</Button>
            <Button type="submit" variant="primary" loading={busy.value} data-testid="assign-save">{tr("crud.confirm")}</Button>
          </div>
        </form>
      </Modal>
    </DataPanel>
  );
}
