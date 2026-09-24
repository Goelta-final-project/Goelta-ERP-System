import * as XLSX from "xlsx";
import type { CatalogItem } from "../domain/catalog";
import { catalogColumns, validExtraColumns } from "./catalog-schema";
export { catalogColumns, validExtraColumns } from "./catalog-schema";
export type { CatalogColumns } from "./catalog-schema";
const blank = (value: unknown) => value === "" || value == null;
function numeric(value: unknown, label: string, row: number) {
  if (
    blank(value) ||
    typeof value === "boolean" ||
    (typeof value === "string" && !/^\s*\d+(\.\d+)?\s*$/.test(value))
  )
    throw Error(
      `Row ${row}: ${label} requires a number, including zero when applicable.`,
    );
  const result = Number(value);
  if (
    !Number.isFinite(result) ||
    result < 0 ||
    result > Number.MAX_SAFE_INTEGER / 100
  )
    throw Error(`Row ${row}: ${label} must be a finite non-negative number.`);
  return result;
}
export function parseCatalog(
  sheet: XLSX.WorkSheet,
  extraColumns: string[],
): CatalogItem[] {
  if (!validExtraColumns(extraColumns))
    throw Error("The template contains invalid or duplicate extra headings.");
  const expected = [...Object.values(catalogColumns), ...extraColumns];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: true,
  });
  const candidates = matrix.slice(0, 20).map((row, index) => ({
    index,
    score: row.filter((v) => expected.includes(String(v).trim())).length,
  }));
  const candidate = candidates.sort((a, b) => b.score - a.score)[0];
  if (!candidate?.score)
    throw Error("No recognized header row found. Use the downloaded template.");
  const headerIndex = candidate.index;
  const headers = matrix[headerIndex].map((v) => String(v ?? ""));
  while (headers.length && headers[headers.length - 1] === "") headers.pop();
  const missing = expected.filter((h) => !headers.includes(h));
  const unknown = headers.filter((h) => !expected.includes(h));
  const duplicates = headers.filter((h, i) => headers.indexOf(h) !== i);
  if (missing.length || unknown.length || duplicates.length)
    throw Error(
      `Excel columns do not match the active template. ${[missing.length && `Missing: ${missing.join(", ")}`, unknown.length && `Unknown: ${unknown.map((h) => h || "(blank heading)").join(", ")}`, duplicates.length && `Duplicate: ${[...new Set(duplicates)].join(", ")}`].filter(Boolean).join(". ")}.`,
    );
  const ids = new Set<string>();
  const result: CatalogItem[] = [];
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (row.every(blank)) continue;
    const rowNumber = i + 1;
    if (row.slice(headers.length).some((v) => !blank(v)))
      throw Error(`Row ${rowNumber}: a value has no column heading.`);
    const get = (heading: string) => row[headers.indexOf(heading)] ?? "";
    const required = (heading: string) => {
      const value = String(get(heading)).trim();
      if (!value) throw Error(`Row ${rowNumber}: ${heading} is required.`);
      return value;
    };
    const id = required(catalogColumns.id);
    if (ids.has(id.toLowerCase()))
      throw Error(`Row ${rowNumber}: duplicate Product ID ${id}.`);
    ids.add(id.toLowerCase());
    const type = required(catalogColumns.type);
    if (type !== "Product" && type !== "Service")
      throw Error(`Row ${rowNumber}: Type must be Product or Service.`);
    const rate = numeric(get(catalogColumns.rate), "Rate", rowNumber);
    const availableValue = get(catalogColumns.available);
    if (type === "Service" && !blank(availableValue))
      throw Error(
        `Row ${rowNumber}: leave Available Quantity empty for services.`,
      );
    const description = required(catalogColumns.description);
    const attributes = Object.fromEntries(
      extraColumns.map((h) => {
        const v = get(h);
        if (typeof v === "number" && !Number.isFinite(v))
          throw Error(`Row ${rowNumber}: ${h} has an invalid number.`);
        return [h, typeof v === "number" ? v : String(v)];
      }),
    );
    result.push({
      id,
      type,
      itemNo: required(catalogColumns.itemNo),
      description,
      name: description,
      unit: required(catalogColumns.unit),
      category: required(catalogColumns.category),
      rate,
      price: rate,
      available:
        type === "Service"
          ? null
          : numeric(availableValue, "Available Quantity", rowNumber),
      attributes,
    });
  }
  if (!result.length)
    throw Error("The workbook has no product or service rows.");
  return result;
}
export function createCatalogTemplate(extras: string[]) {
  if (!validExtraColumns(extras))
    throw Error("The template contains invalid or duplicate extra headings.");
  const headers = [...Object.values(catalogColumns), ...extras];
  const sheet = XLSX.utils.aoa_to_sheet([
    ["GOELTA SALES CATALOG TEMPLATE"],
    [],
    headers,
    [
      "1.1",
      "PRD-001",
      "Product",
      "Example material or stock item",
      "Materials",
      "Sq.Ft",
      0,
      0,
      ...extras.map(() => ""),
    ],
    [
      "2.1",
      "SRV-001",
      "Service",
      "Example installation or labour service",
      "Services",
      "Item",
      0,
      "",
      ...extras.map(() => ""),
    ],
  ]);
  sheet["!cols"] = headers.map((h) => ({
    wch: h === "Description" ? 42 : Math.max(14, Math.min(42, h.length + 4)),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Catalog");
  return book;
}
