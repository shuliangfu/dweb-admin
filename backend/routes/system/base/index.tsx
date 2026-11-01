/**
 * /system/base — site name and collapsed label are saved; other rows are a preview.
 */
import type { LoadContext } from "@dreamer/dweb";
import { resolveLocale, type Locale } from "@common/i18n/mod.ts";
import { BaseSettings } from "@backend/components/BaseSettings.tsx";

export async function load(ctx: LoadContext) {
  const { getSiteBrand } = await import("@common/service/site.ts");
  const brand = await getSiteBrand();
  return { locale: resolveLocale(ctx.req), website: brand.website, shortName: brand.shortName };
}

export default function Page(props: {
  data?: { locale?: Locale; website?: string; shortName?: string };
}) {
  return (
    <BaseSettings
      locale={props.data?.locale ?? "zh-CN"}
      website={props.data?.website ?? ""}
      shortName={props.data?.shortName ?? ""}
    />
  );
}
