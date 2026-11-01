/**
 * Stub: /user/new — Vue user/… (新增会员 / New members).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("user.new");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="user.new" />;
}
