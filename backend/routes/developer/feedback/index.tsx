/**
 * Stub: /developer/feedback — Vue developer/… (问题反馈列表 / Feedback).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("developer.feedback");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="developer.feedback" />;
}
