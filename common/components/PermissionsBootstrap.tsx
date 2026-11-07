/**
 * SSR → client hydrate of mePerms so Can/can() work without an extra round-trip.
 */
import { onMount } from "@dreamer/view";
import { setMePermissions } from "@common/hook/can.ts";

export function PermissionsBootstrap(props: {
  permissions: string[];
  isSuper: boolean;
}) {
  const apply = () =>
    setMePermissions({
      permissions: props.permissions ?? [],
      isSuper: !!props.isSuper,
    });
  apply();
  onMount(apply);
  return null;
}
