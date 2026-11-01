/**
 * Stub: /finance/recharge — Vue finance/… (充值记录列表 / Recharges).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("finance.recharge");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="finance.recharge" />;
}
