/**
 * Stub: /finance/wallet/log — Vue finance/… (钱包日志 / Wallet logs).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("finance.wallet-log");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="finance.wallet-log" />;
}
