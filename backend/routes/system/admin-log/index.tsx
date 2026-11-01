/**
 * Stub: /system/admin-log — Vue system/… (管理员日志列表 / Admin logs).
 * Demo data only; replace when domain models exist.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("system.admin-log");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="system.admin-log" />;
}
