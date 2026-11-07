/** Current user — dual: `me` (action) + `GET` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { listPermissionsFromGraph, loadGraph } from "@common/service/rbac.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function me(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  const { permissions, isSuper } = listPermissionsFromGraph(await loadGraph(), user.roleCodes);
  return jsonResponse({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      roleCodes: user.roleCodes,
      isSuper: user.isSuper || isSuper,
      permissions,
    },
    permissions,
    isSuper: user.isSuper || isSuper,
  });
}
