/**
 * Route registry. Transfer (Yii-style manage/unmanage) + managed table for Vue column parity.
 * AuthRoute has method/path/source/timestamps — no separate route `name` (Vue name column N/A).
 */
import { createSignal } from "@dreamer/view";
import { Alert, Button, FormItem, Modal, Table, Tag, Textarea, Transfer } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, reload, toastResult } from "@backend/components/crud-kit.tsx";
import { DataPanel, type DataPanelChildrenCtx } from "@common/components/DataPanel.tsx";

export type ManagedRouteRow = {
  key: string;
  method: string;
  path: string;
  source: string;
  createdAt?: string;
};

const addOpen = createSignal(false);
const addText = createSignal("");
const target = createSignal<string[]>([]);
const busy = createSignal(false);

function fmtTs(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 19).replace("T", " ");
}

export function RoutesAdmin(props: {
  locale: Locale;
  managed: string[];
  available: string[];
  managedDetail: ManagedRouteRow[];
}) {
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
    const r = await api("POST", "/api/rbac/routes/sync", { add, remove });
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) reload();
  }

  async function addManual() {
    if (busy.value) return;
    busy.value = true;
    const r = await api("POST", "/api/rbac/routes/create", { routes: addText.value });
    busy.value = false;
    if (toastResult(r, tr("crud.saved"), tr("crud.networkError"))) reload();
  }

  const tableRows = props.managedDetail.map((r, i) => ({ ...r, idx: i + 1 }));

  return (
    <div>
      <DataPanel
        title={tr("rbac.routeTitle")}
        tools={{ create: true, refresh: true, print: true, column: true, export: true }}
        onCreate={() => {
          addText.value = "";
          addOpen.value = true;
        }}
        onRefresh={reload}
        toolLabels={{
          print: tr("panel.print"),
          column: tr("panel.column"),
          export: tr("panel.export"),
          soon: tr("panel.soon"),
          resetColumns: tr("panel.resetColumns"),
          csv: "CSV",
        }}
        toolbarExtra={
          <Button type="button" variant="primary" onClick={save}>{tr("rbac.routeSave")}</Button>
        }
        columns={[
          { prop: "idx", label: tr("rbac.index") },
          { prop: "path", label: tr("rbac.routePath") },
          { prop: "method", label: tr("rbac.routeMethod") },
          { prop: "source", label: tr("rbac.routeSource") },
          { prop: "createdAt", label: tr("common.createdAt") },
        ]}
        rows={tableRows as never}
        rowKey="key"
        emptyText={tr("common.empty")}
      >
        {(ctx: DataPanelChildrenCtx) => (
          <>
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
              listStyle={{ width: 420, height: 360 }}
              onChange={(next: string[]) => {
                target.value = next;
              }}
              messages={{ count: (n: number) => `${n}`, selectedSuffix: (n: number) => ` / ${n}` }}
            />
            <h3 class="mb-2 mt-5 text-sm font-medium text-slate-700 dark:text-slate-200">
              {tr("rbac.routeManagedTable")}
            </h3>
            <Table
              bordered
              hoverable
              size="sm"
              rowKey="key"
              dataSource={tableRows}
              pagination={{ pageSize: 50, total: tableRows.length }}
              locale={{ emptyText: tr("common.empty") }}
              columns={ctx.filterTableColumns(([
                { key: "idx", title: tr("rbac.index"), dataIndex: "idx", width: 60 },
                { key: "path", title: tr("rbac.routePath"), dataIndex: "path" },
                {
                  key: "method",
                  title: tr("rbac.routeMethod"),
                  render: (_v: unknown, r: ManagedRouteRow) => (
                    <Tag size="xs" variant="default">{r.method}</Tag>
                  ),
                },
                {
                  key: "source",
                  title: tr("rbac.routeSource"),
                  render: (_v: unknown, r: ManagedRouteRow) => (
                    r.source === "manual" ? tr("rbac.sourceManual")
                      : r.source === "scan" ? tr("rbac.sourceScan")
                      : r.source === "seed" ? tr("rbac.sourceSeed")
                      : r.source
                  ),
                },
                {
                  key: "createdAt",
                  title: tr("common.createdAt"),
                  render: (_v: unknown, r: ManagedRouteRow) => fmtTs(r.createdAt),
                },
              ] as never))}
            />
          </>
        )}
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
