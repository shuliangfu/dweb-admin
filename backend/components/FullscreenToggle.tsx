/**
 * Top-bar fullscreen control (documentElement). Matches Vue TopHeader switchScreen.
 */
import { createSignal, onCleanup, onMount } from "@dreamer/view";
import { IconExitFullscreen, IconMaximize2 } from "@dreamer/ui-view";
import { triggerCls } from "@backend/components/menu-kit.tsx";

type DocLike = {
  fullscreenElement: unknown;
  exitFullscreen?: () => Promise<void>;
  documentElement: { requestFullscreen?: () => Promise<void> };
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

const isFull = createSignal(false);

function doc(): DocLike | undefined {
  return (globalThis as { document?: DocLike }).document;
}

function sync(): void {
  const d = doc();
  if (!d) return;
  isFull.value = !!d.fullscreenElement;
}

function toggle(): void {
  const d = doc();
  if (!d) return;
  if (d.fullscreenElement) {
    void d.exitFullscreen?.();
  } else {
    void d.documentElement.requestFullscreen?.();
  }
}

export function FullscreenToggle(props: { enterLabel: string; exitLabel: string }) {
  onMount(() => {
    const d = doc();
    if (!d) return;
    sync();
    d.addEventListener("fullscreenchange", sync);
    onCleanup(() => d.removeEventListener("fullscreenchange", sync));
  });

  return (
    <button
      type="button"
      data-testid="fullscreen-toggle"
      class={triggerCls}
      title={props.enterLabel}
      aria-label={props.enterLabel}
      onClick={toggle}
    >
      {() =>
        isFull.value
          ? <IconExitFullscreen size="xs" />
          : <IconMaximize2 size="xs" />
      }
    </button>
  );
}
