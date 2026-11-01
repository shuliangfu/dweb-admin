/**
 * Stub: /count/withdraw — Vue count/… (提现统计表 / Withdraw stats).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("count.withdraw");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="count.withdraw" />;
}
