/**
 * Route registry. Top: Transfer (manage / un-manage scanned routes, saved explicitly).
 * Below: server-driven managed table (resource "routes"): search, sort, paging, export,
 * Modal create (manual routes), confirmed un-manage (single + batch).
 */
import { createSignal } from "@dreamer/view";
import { Alert, Button, Card, Transfer } from "@dreamer/ui-view";
import { Can } from "@common/components/Can.tsx";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel, type PanelInitial, refreshPanel } from "@common/components/DataPanel.tsx";

const target = createSignal<string[]>([]);
const managedNow = createSignal<string[]>([]);
const busy = createSignal(false);

export function RoutesAdmin(props: { locale: Locale; initial: PanelInitial; managed: string[]; available: string[] }) {
  const tr = createT(props.locale);
  if (!managedNow.value.length && !target.value.length) {
    managedNow.value = [...props.managed];
    target.value = [...props.managed];
  }
  const data = [...props.managed, ...props.available]
    .sort((a, b) => a.split(" ")[1].localeCompare(b.split(" ")[1]) || a.localeCompare(b))
    .map((k) => ({ key: k, title: k }));

  async function save() {
    if (busy.value) return;
    const next = target.value;
    const add = next.filter((k) => !managedNow.value.includes(k));
    const remove = managedNow.value.filter((k) => !next.includes(k));
    if (!add.length && !remove.length) return void toastResult({ ok: true, status: 200, data: {} }, tr("rbac.routeNone"), "");
    busy.value = true;
    const r = await api("POST", "/api/rbac/routes/sync", { add, remove });
    busy.value = false;
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) {
      managedNow.value = [...next];
      await refreshPanel(props.initial.meta.key);
    }
  }

  return (
    <div class="grid gap-4">
      <Card>
        <Alert type="info" message={tr("rbac.routeNote")} class="mb-3" />
        <p class="mb-2 text-xs opacity-70">{tr("rbac.routeScanned", { n: props.available.length })}</p>
        <Transfer
          dataSource={data}
          targetKeys={target}
          showSearch
          titles={[tr("rbac.routeUnmanaged"), tr("rbac.routeManaged")]}
          searchPlaceholder={[tr("rbac.transferSearch"), tr("rbac.transferSearch")]}
          listStyle={{ width: 420, height: 320 }}
          onChange={(next: string[]) => {
            target.value = next;
          }}
          messages={{ count: (n: number) => `${n}`, selectedSuffix: (n: number) => ` / ${n}` }}
        />
        <div class="mt-3">
          <Can permission="rbac.write">
            <Button type="button" variant="primary" loading={busy.value} data-testid="routes-save" onClick={save}>
              {tr("rbac.routeSave")}
            </Button>
          </Can>
        </div>
      </Card>
      <DataPanel initial={props.initial} locale={props.locale} />
    </div>
  );
}
