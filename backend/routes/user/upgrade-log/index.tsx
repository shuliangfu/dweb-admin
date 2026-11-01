/**
 * Stub: /user/upgrade-log — Vue user/… (升级记录列表 / Upgrade logs).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("user.upgrade-log");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="user.upgrade-log" />;
}
