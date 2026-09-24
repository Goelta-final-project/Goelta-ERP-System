export const catalogColumns = {
  itemNo: "Item No.",
  id: "Product ID",
  type: "Type",
  description: "Description",
  category: "Category",
  unit: "Unit",
  rate: "Rate",
  available: "Available Quantity",
};
export type CatalogColumns = typeof catalogColumns;
export function validExtraColumns(value: unknown): value is string[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (v) =>
        typeof v === "string" &&
        v === v.trim() &&
        v.length > 0 &&
        v.length <= 60 &&
        !/[\r\n]/.test(v),
    )
  )
    return false;
  const names = [...Object.values(catalogColumns), ...value].map((v) =>
    v.toLowerCase(),
  );
  return new Set(names).size === names.length;
}
