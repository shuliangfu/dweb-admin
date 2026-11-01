/**
 * Stub: /finance/wallet/add-sub — Vue finance/… (钱包加减款 / Wallet adjust).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("finance.wallet-add-sub");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="finance.wallet-add-sub" />;
}
