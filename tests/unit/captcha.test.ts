import { assert, assertEquals } from "@std/assert";
import {
  CAPTCHA_COOKIE,
  clearCaptchaCookie,
  issueCaptcha,
  verifyCaptcha,
} from "@common/service/captcha.ts";

function requestWith(setCookie: string): Request {
  const token = setCookie.slice(
    setCookie.indexOf("=") + 1,
    setCookie.indexOf(";"),
  );
  return new Request("http://local/api/auth/login", {
    headers: { cookie: `${CAPTCHA_COOKIE}=${token}` },
  });
}

Deno.test("captcha: svg + cookie round trip, wrong code rejected", async () => {
  const issued = await issueCaptcha();
  assert(issued.svg.includes("<svg"));
  assert(issued.setCookie.startsWith(`${CAPTCHA_COOKIE}=`));
  assert(issued.setCookie.includes("HttpOnly"));

  const req = requestWith(issued.setCookie);
  assertEquals(await verifyCaptcha(req, issued.code.toLowerCase()), true);
  assertEquals(await verifyCaptcha(req, "zzzz"), false);
  assertEquals(
    await verifyCaptcha(new Request("http://local/"), issued.code),
    false,
  );
  assert(clearCaptchaCookie().includes("Max-Age=0"));
});
