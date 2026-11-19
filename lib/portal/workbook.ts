import { exportPortalSheets, importPortalSheets, type PortalSheet } from "@/lib/portal/excel";
import type { PortalDocument } from "@/lib/portal/types";

function columnWidths(rows: string[][]) {
  const count = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return Array.from({ length: count }, (_, index) => {
    const width = rows.reduce((max, row) => {
      const value = String(row[index] ?? "");
      let visual = 0;
      for (const char of value) visual += char.charCodeAt(0) > 255 ? 2 : 1;
      return Math.max(max, visual);
    }, 10);
    return { wch: Math.min(64, width + 2) };
  });
}

function asRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row.map((item) => (item == null ? "" : String(item))) : []));
}

export async function downloadPortalWorkbook(doc: PortalDocument) {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();
  for (const sheet of exportPortalSheets(doc)) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    worksheet["!cols"] = columnWidths(sheet.rows);
    XLSX.utils.book_append_sheet(book, worksheet, sheet.name);
  }
  const bytes = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "LZK门户.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export async function readPortalWorkbook(current: PortalDocument, file: ArrayBuffer) {
  const XLSX = await import("xlsx");
  const book = XLSX.read(file, { type: "array" });
  const sheets: PortalSheet[] = book.SheetNames.map((name) => ({
    name,
    rows: asRows(XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: false, defval: "" })),
  }));
  return importPortalSheets(current, sheets);
}
