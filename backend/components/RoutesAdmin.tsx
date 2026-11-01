/**
 * Route registry. Left = scanned routes not yet managed, right = managed routes
 * (the only ones assignable to roles / permissions). "Add route" is a Modal;
 * "Refresh" re-scans backend/routes. Transfer edits are saved with "Save changes".
 */
import { createSignal } from "@dreamer/view";
import { Alert, Button, FormItem, Modal, Textarea, Transfer } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, reload, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel } from "@common/components/DataPanel.tsx";

const addOpen = createSignal(false);
const addText = createSignal("");
const target = createSignal<string[]>([]);
const busy = createSignal(false);

export function RoutesAdmin(props: { locale: Locale; managed: string[]; available: string[] }) {
  const tr = createT(props.locale);
  target.value = [...props.managed];
  const data = [...props.managed, ...props.available]
    .sort((a, b) => a.split(" ")[1].localeCompare(b.split(" ")[1]) || a.localeCompare(b))
    .map((k) => ({ key: k, title: k }));

  async function save() {
    const next = target.value;
    const add = next.filter((k) => !props.managed.includes(k));
    const remove = props.managed.filter((k) => !next.includes(k));
    if (!add.length && !remove.length) return void toastResult({ ok: true, status: 200, data: {} }, tr("rbac.routeNone"), "");
    const r = await api("PUT", "/api/rbac/routes", { add, remove });
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) reload();
  }

  async function addManual() {
    if (busy.value) return;
    busy.value = true;
    const r = await api("POST", "/api/rbac/routes", { routes: addText.value });
    busy.value = false;
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) reload();
  }

  return (
    <div>
      <DataPanel
        title={tr("rbac.routeTitle")}
        tools={{ create: true, refresh: true }}
        onCreate={() => {
          addText.value = "";
          addOpen.value = true;
        }}
        onRefresh={reload}
        toolbarExtra={
          <Button type="button" variant="primary" onClick={save}>{tr("rbac.routeSave")}</Button>
        }
      >
      <Alert type="info" message={tr("rbac.routeNote")} class="mb-3" />
      <p class="mb-2 text-xs opacity-70">
        {tr("rbac.routeScanned", { n: props.available.length })}
      </p>
      <Transfer
        dataSource={data}
        targetKeys={target}
        showSearch
        titles={[tr("rbac.routeUnmanaged"), tr("rbac.routeManaged")]}
        searchPlaceholder={[tr("rbac.transferSearch"), tr("rbac.transferSearch")]}
        listStyle={{ width: 420, height: 420 }}
        onChange={(next: string[]) => {
          target.value = next;
        }}
        messages={{ count: (n: number) => `${n}`, selectedSuffix: (n: number) => ` / ${n}` }}
      />
      </DataPanel>

      <Modal
        open={addOpen}
        title={tr("rbac.routeAddTitle")}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          addOpen.value = false;
        }}
      >
        <div class="grid gap-3">
          <FormItem label={tr("rbac.routeInput")} required>
            <Textarea
              rows={5}
              value={addText}
              placeholder={"GET /api/orders\nPOST /api/orders\n/reports/*"}
              onInput={(e: Event) => {
                addText.value = (e.target as unknown as { value: string }).value;
              }}
            />
          </FormItem>
          <p class="text-xs opacity-70">{tr("rbac.routeInputHint")}</p>
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                addOpen.value = false;
              }}
            >
              {tr("crud.cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={addManual}>{tr("crud.confirm")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
