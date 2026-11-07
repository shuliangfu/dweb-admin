/**
 * Fullpage shell shared by login / forget / reset.
 * Vue fullpage/login.vue: left illustration (#363e54) + right form; lang/theme top-right.
 */
import type { JSXRenderable } from "@dreamer/view";
import { Card, MessageContainer, Stack, ToastContainer } from "@dreamer/ui-view";
import type { Locale } from "@common/i18n/mod.ts";
import { createT } from "@common/i18n/mod.ts";
import { LangMenu } from "@backend/components/LangMenu.tsx";
import { ThemeMenu } from "@backend/components/ThemeMenu.tsx";

export function AuthShell(props: {
  locale: Locale;
  title: string;
  subtitle?: string;
  /** When true (login), show Vue-style left art panel on md+. */
  showLeftArt?: boolean;
  children?: JSXRenderable;
}) {
  const tr = createT(props.locale);
  const showArt = props.showLeftArt !== false;
  return (
    <div class="adm-auth relative flex min-h-screen flex-col">
      <div class="absolute right-5 top-2.5 z-10 flex items-center gap-1">
        <LangMenu locale={props.locale} />
        <ThemeMenu locale={props.locale} />
      </div>
      <div class="flex min-h-screen flex-1 flex-col md:flex-row">
        {showArt
          ? (
            <div
              class="adm-login-left hidden flex-1 items-center justify-center md:flex"
              data-testid="login-left-art"
            >
              <div class="px-8 text-center">
                <img
                  src="/assets/images/login.svg"
                  alt=""
                  class="mx-auto w-login-art max-w-full"
                  width="500"
                  height="400"
                />
                <p class="adm-login-desc mt-0 text-center text-3xl text-white">
                  {tr("login.welcomeSystem")}
                </p>
              </div>
            </div>
          )
          : null}
        <div class="flex flex-1 items-center justify-center px-4 py-16">
          <div class="w-full max-w-login-form">
            <Stack gap={2} align="center" class="mb-8 text-center">
              {!showArt
                ? <span class="inline-block h-12 w-12 rounded-xl bg-primary-600" />
                : null}
              <h1 class="mt-2 text-2xl font-bold">{props.title}</h1>
              {props.subtitle
                ? <p class="text-sm text-slate-500 dark:text-slate-400">{props.subtitle}</p>
                : null}
            </Stack>
            <Card bordered class="shadow-lg">{props.children}</Card>
          </div>
        </div>
      </div>
      <ToastContainer />
      <MessageContainer />
    </div>
  );
}
