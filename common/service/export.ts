/**
 * Server-side export of a resource list: every row matching the filters, display values,
 * only the requested (visible) columns. xlsx is a real OOXML workbook (exceljs).
 */
import ExcelJS from "exceljs";
import type { Locale } from "@common/i18n/mod.ts";
import { displayValue } from "@common/resources/display.ts";
import { type ColDef, pick, type Row } from "@common/resources/types.ts";

export type ExportFormat = "xlsx" | "csv" | "json" | "xml" | "html";
export const EXPORT_FORMATS: ExportFormat[] = ["xlsx", "csv", "json", "xml", "html"];
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const csvCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);

/** Neutralise spreadsheet formula injection for text cells. */
function safeText(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export async function buildExport(opts: {
  format: ExportFormat;
  title: string;
  basename: string;
  columns: ColDef[];
  rows: Row[];
  locale: Locale;
  totals?: Record<string, number>;
  totalLabel?: string;
}): Promise<Response> {
  const { format, columns, rows, locale } = opts;
  const heads = columns.map((c) => pick(c.label, locale));
  const table = rows.map((r) => columns.map((c) => displayValue(c, r, locale)));
  const ts = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const filename = `${opts.basename}-${ts}`;
  const disp = (ext: string) => `attachment; filename="${filename}.${ext}"; filename*=UTF-8''${encodeURIComponent(filename)}.${ext}`;

  switch (format) {
    case "xlsx": {
      const wb = new ExcelJS.Workbook();
      wb.creator = "dweb-admin";
      const ws = wb.addWorksheet(opts.title.slice(0, 28) || "Sheet1");
      ws.columns = columns.map((c, i) => ({
        header: heads[i],
        key: c.prop,
        width: Math.min(40, Math.max(12, heads[i].length * 2 + 2)),
      }));
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C8DBC" } };
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.views = [{ state: "frozen", ySplit: 1 }];
      rows.forEach((r) => {
        ws.addRow(columns.map((c) => {
          const raw = r[c.prop];
          if ((c.type === "number" || c.type === "money") && raw !== null && raw !== "" && Number.isFinite(Number(raw))) {
            return Number(raw);
          }
          return safeText(displayValue(c, r, locale));
        }));
      });
      if (opts.totals && Object.keys(opts.totals).length) {
        const sum = columns.map((c, i) =>
          i === 0 ? (opts.totalLabel ?? "Total") : (opts.totals![c.prop] ?? "")
        );
        const row = ws.addRow(sum);
        row.font = { bold: true };
      }
      const buf = await wb.xlsx.writeBuffer();
      return new Response(buf as ArrayBuffer, {
        headers: { "content-type": XLSX_MIME, "content-disposition": disp("xlsx") },
      });
    }
    case "csv": {
      const lines = [heads, ...table].map((r) => r.map((c) => csvCell(safeText(c))).join(","));
      return new Response("\uFEFF" + lines.join("\r\n"), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": disp("csv") },
      });
    }
    case "json": {
      const out = rows.map((_, i) => Object.fromEntries(columns.map((c, j) => [c.prop, table[i][j]])));
      return new Response(JSON.stringify(out, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8", "content-disposition": disp("json") },
      });
    }
    case "xml": {
      const body = rows.map((_, i) =>
        `  <row>\n${columns.map((c, j) => `    <${c.prop.replace(/[^A-Za-z0-9_]/g, "_")}>${esc(table[i][j])}</${c.prop.replace(/[^A-Za-z0-9_]/g, "_")}>`).join("\n")}\n  </row>`
      ).join("\n");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n${body}\n</rows>\n`, {
        headers: { "content-type": "application/xml; charset=utf-8", "content-disposition": disp("xml") },
      });
    }
    default: {
      const th = heads.map((h) => `<th>${esc(h)}</th>`).join("");
      const tr = table.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)}</title>` +
        `<style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}th{background:#3c8dbc;color:#fff}</style>` +
        `</head><body><h3>${esc(opts.title)}</h3><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`;
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "content-disposition": disp("html") },
      });
    }
  }
}
