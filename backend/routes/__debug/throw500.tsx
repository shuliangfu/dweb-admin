/**
 * Local-only debug trigger: intentionally throws so dweb renders framework `_500`.
 *
 * Enable:  DWEB_ADMIN_DEBUG_500=1  (e.g. in .env) then restart backend.
 * Disable: unset or set DWEB_ADMIN_DEBUG_500=0 / omit the var, then restart.
 *
 * Not for production. Path is auth-only (login required).
 */
import type { LoadContext } from "@dreamer/dweb";
import { getEnv } from "@common/utils/env.ts";

/** Marker message — appears in `_500` ErrorPage detail when RUNTIME_ENV=dev. */
export const DEBUG_THROW_500_MESSAGE = "DWEB_ADMIN_DEBUG_THROW_500";

function debug500Enabled(): boolean {
  return getEnv("DWEB_ADMIN_DEBUG_500") === "1";
}

export async function load(_ctx: LoadContext) {
  if (!debug500Enabled()) {
    return { enabled: false as const };
  }
  throw new Error(DEBUG_THROW_500_MESSAGE);
}

export default function DebugThrow500Page(props: {
  data?: { enabled?: boolean };
}) {
  if (props.data?.enabled === false) {
    return (
      <div data-testid="debug-throw500-disabled" style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Debug 500 trigger disabled</h1>
        <p>
          Set <code>DWEB_ADMIN_DEBUG_500=1</code> in <code>.env</code> and restart
          the backend to force a framework <code>_500</code> catch.
        </p>
      </div>
    );
  }
  return <div data-testid="debug-throw500-should-not-render">should not render</div>;
}
