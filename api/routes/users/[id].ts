/**
 * Sample user detail — dual: `view` (action) + `GET` (restful).
 */
import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users: Record<string, { id: string; name: string }> = {
  "1": { id: "1", name: "Alice" },
  "2": { id: "2", name: "Bob" },
};

export function view(ctx: ApiContext) {
  const id = ctx.params?.id ?? "";
  const user = users[id];
  if (!user) {
    return json({ error: "not_found", id }, 404);
  }
  return json({ user });
}

export const GET = view;
