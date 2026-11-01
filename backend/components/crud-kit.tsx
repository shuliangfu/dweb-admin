/** Small shared pieces for the CRUD pages (all create/edit forms are ui-view Modals). */
import { Button, Modal, message } from "@dreamer/ui-view";
import type { Signal } from "@dreamer/view";
import { api, type ApiResult } from "@common/utils/client-api.ts";

export function reload(): void {
  (globalThis as { location?: { reload: () => void } }).location?.reload();
}

/** Show the server's localized error (or success text) as a toast; returns ok. */
export function toastResult(r: ApiResult<any>, okText: string, netText: string): boolean {
  if (r.ok) {
    message.success(okText);
    return true;
  }
  message.error(r.status === 0 ? netText : (r.data.message ?? r.data.error ?? netText));
  return false;
}

export { api };

/** Confirm-delete modal driven by a signal holding the pending name ("" = closed). */
export function ConfirmDelete(props: {
  target: Signal<string>;
  title: string;
  ask: (name: string) => string;
  okText: string;
  cancelText: string;
  onConfirm: (name: string) => void | Promise<void>;
}) {
  const open = props.target;
  return (
    <Modal
      open={() => open.value !== ""}
      title={props.title}
      width="sm"
      keyboard
      destroyOnClose
      onClose={() => {
        open.value = "";
      }}
    >
      <p class="mb-5 text-sm">{() => props.ask(open.value)}</p>
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            open.value = "";
          }}
        >
          {props.cancelText}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={async () => {
            const name = open.value;
            open.value = "";
            await props.onConfirm(name);
          }}
        >
          {props.okText}
        </Button>
      </div>
    </Modal>
  );
}

export function PageTitle(props: { title: string; children?: unknown }) {
  return (
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="m-0 text-lg font-semibold">{props.title}</h1>
      <div class="flex items-center gap-2">{props.children}</div>
    </div>
  );
}
