/**
 * Fullpage shell shared by login / forget / reset — lang + theme in the corner.
 */
import type { VNode } from "@dreamer/view";
import { Card, MessageContainer, Stack, ToastContainer } from "@dreamer/ui-view";
import type { Locale } from "@common/i18n/mod.ts";
import { LangMenu } from "@backend/components/LangMenu.tsx";
import { ThemeMenu } from "@backend/components/ThemeMenu.tsx";

export function AuthShell(props: {
  locale: Locale;
  title: string;
  subtitle?: string;
  children?: VNode | VNode[];
}) {
  return (
    <div class="flex min-h-screen flex-col">
      <div class="flex items-center justify-end gap-1 p-4">
        <LangMenu locale={props.locale} />
        <ThemeMenu locale={props.locale} />
      </div>
      <div class="flex flex-1 items-center justify-center px-4 pb-16">
        <div class="w-full max-w-[400px]">
          <Stack gap={2} align="center" class="mb-8 text-center">
            <span class="inline-block h-12 w-12 rounded-xl bg-primary-600" />
            <h1 class="mt-2 text-xl font-bold">{props.title}</h1>
            {props.subtitle
              ? <p class="text-sm text-slate-500 dark:text-slate-400">{props.subtitle}</p>
              : null}
          </Stack>
          <Card bordered class="shadow-lg">{props.children}</Card>
        </div>
      </div>
      <ToastContainer />
      <MessageContainer />
    </div>
  );
}
