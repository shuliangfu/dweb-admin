/**
 * Stub: /cms/qa — Vue cms/… (问答列表 / Q&A).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("cms.qa");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="cms.qa" />;
}
