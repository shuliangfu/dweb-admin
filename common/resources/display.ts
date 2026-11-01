/** Cell display values shared by the table (browser) and server-side exports. */
import type { Locale } from "@common/i18n/mod.ts";
import { type ColDef, pick, type Row } from "./types.ts";

const p2 = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD HH:mm:ss" in the runtime's local time; "" for empty / invalid. */
export function fmtDateTime(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

export function fmtMoney(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtNumber(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

/** Human text of a cell: tags use their option label, dates are formatted, etc. */
export function displayValue(col: ColDef, row: Row, locale: Locale): string {
  const raw = row[col.prop];
  switch (col.type) {
    case "tag": {
      const o = col.options?.find((x) => x.value === String(raw));
      return o ? pick(o.label, locale) : (raw == null ? "" : String(raw));
    }
    case "bool":
      return raw ? (locale === "zh-CN" ? "是" : "Yes") : (locale === "zh-CN" ? "否" : "No");
    case "datetime":
      return fmtDateTime(raw);
    case "money":
      return fmtMoney(raw);
    case "number":
      return fmtNumber(raw);
    default:
      if (raw === null || raw === undefined) return "";
      if (Array.isArray(raw)) return raw.join(", ");
      return typeof raw === "object" ? JSON.stringify(raw) : String(raw);
  }
}
