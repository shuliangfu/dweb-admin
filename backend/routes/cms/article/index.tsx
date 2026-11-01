/**
 * Skeleton: cms/article — Vue 文章列表 / Articles.
 * No `CmsArticle` model in common/model — keep StubList (Vue-shaped columns/search).
 * Do not fake list/CRUD APIs. Wire when a domain model lands; see docs/handoff.md.
 */
import { stubLoad, StubPageView } from "@backend/components/stub-page.tsx";

export const load = stubLoad("cms.article");

export default function Page(props: { data?: { locale?: "zh-CN" | "en-US"; pageKey?: string } }) {
  return <StubPageView data={props.data} pageKey="cms.article" />;
}
