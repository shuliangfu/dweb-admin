/**
 * Stub: /system/bonus — Vue system/… (奖金设置 / Bonus settings).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("system.bonus");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="system.bonus" />;
}
