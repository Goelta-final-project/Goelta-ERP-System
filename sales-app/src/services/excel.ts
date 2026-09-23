import * as XLSX from "xlsx";
import {
  catalogColumns,
  createCatalogTemplate,
  parseCatalog,
} from "./catalog-import";
import { lineFromProduct } from "./domain";
import type { CatalogItem, Line } from "./model";

export function downloadSchema(extras: string[], forLines = false) {
  const book = createCatalogTemplate(extras);
  if (forLines) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets.Catalog, {
      header: 1,
      defval: "",
    });
    rows[2].push("Quantity");
    rows[3].push(1);
    rows[4].push(1);
    book.Sheets.Catalog = XLSX.utils.aoa_to_sheet(rows);
  }
  XLSX.writeFile(
    book,
    forLines ? "GOELTA-quotation-lines.xlsx" : "GOELTA-product-schema.xlsx",
  );
}
export async function readWorkbook(file: File) {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Choose a workbook smaller than 10 MB.");
  const book = XLSX.read(await file.arrayBuffer());
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw Error("The workbook has no worksheet.");
  return sheet;
}
export function parseQuotationLines(
  sheet: XLSX.WorkSheet,
  extras: string[],
  products: CatalogItem[],
): Line[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: true,
  });
  const header = rows.findIndex(
    (row) => row.includes(catalogColumns.id) && row.includes("Quantity"),
  );
  if (header < 0)
    throw Error(
      "Use the quotation line schema, including the Quantity column.",
    );
  const qtyIndex = rows[header].indexOf("Quantity");
  if (rows[header].filter((v) => v === "Quantity").length !== 1)
    throw Error("The Quantity column must appear exactly once.");
  const quantities = rows.slice(header + 1).flatMap((row, idx) => {
    if (row.every((v) => v === "" || v == null)) return [];
    const raw = row[qtyIndex];
    const qty = Number(raw);
    if (
      (typeof raw !== "number" &&
        (typeof raw !== "string" || !/^\s*\d+(\.\d+)?\s*$/.test(raw))) ||
      !Number.isFinite(qty) ||
      qty <= 0
    )
      throw Error(
        `Row ${header + idx + 2}: Quantity must be a positive number.`,
      );
    return [qty];
  });
  const data = parseCatalog(
    XLSX.utils.aoa_to_sheet(
      rows.map((row) => row.filter((_, idx) => idx !== qtyIndex)),
    ),
    extras,
  );
  return data.map((p, idx) => ({
    ...lineFromProduct(p),
    catalogId: products.find(
      (item) => item.id.toLowerCase() === p.id.toLowerCase(),
    )?.id,
    quantity: quantities[idx],
  }));
}
