/**
 * Thin Can + ui-view Button — same permission API as <Can> / can(), no third gate.
 */
import { Button, type ButtonProps } from "@dreamer/ui-view";
import { Can } from "./Can.tsx";

export function PermissionButton(
  props: ButtonProps & { permission: string | string[] },
) {
  const { permission, ...btn } = props;
  return (
    <Can permission={permission}>
      <Button {...btn} />
    </Can>
  );
}
