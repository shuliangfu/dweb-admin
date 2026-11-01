/** Read the theme mode cookie (dweb-admin-theme) from a Cookie header; defaults to "system". */
export function themeFromCookie(cookieHeader: string | null | undefined): "light" | "dark" | "system" {
  const m = (cookieHeader ?? "").match(/(?:^|;\s*)dweb-admin-theme=([^;]*)/);
  const v = m?.[1];
  return v === "light" || v === "dark" ? v : "system";
}
