/**
 * Captcha image — Vue `GET /site/captcha` parity.
 * GET /api/auth/captcha (public).
 * Action name is `captcha`: this URL has three segments, so it does not
 * fall back to `index` (that fallback is only `/api/<resource>`).
 */
import type { ApiContext } from "@dreamer/dweb";
import { issueCaptcha } from "@common/service/captcha.ts";

export async function captcha(_ctx: ApiContext) {
  const { svg, setCookie } = await issueCaptcha();
  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "set-cookie": setCookie,
    },
  });
}
