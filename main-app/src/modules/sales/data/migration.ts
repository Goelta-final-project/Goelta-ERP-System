import type { Line, Sale, Workspace } from "../domain/types";
import { event, totals, uid } from "../domain/workflow";
import { validExtraColumns } from "../services/catalog-schema";
import { storageKey } from "./keys";
import { seedWorkspace } from "./seeds";
import {
  record,
  validCompany,
  validProduct,
  validWorkspace,
} from "./validation";

// Read the previous app only when this new workspace has never been saved.
// Legacy keys remain untouched, including removed subcontract information.
export function initialWorkspace(storage: Pick<Storage, "getItem">): Workspace {
  const seed = seedWorkspace();
  if (storage.getItem(storageKey) !== null) return seed;
  const customers = storage.getItem("goelta.customer-companies.v1");
  const products = storage.getItem("goelta.catalog.v1");
  const quotes = storage.getItem("goelta.quotations.v1");
  const extras = storage.getItem("goelta.catalog-template.extra-columns.v1");
  if (!customers && !products && !quotes && !extras) return seed;
  if (customers) {
    const data: unknown = JSON.parse(customers);
    if (!Array.isArray(data) || !data.every(validCompany))
      throw Error("Existing customer data cannot be imported.");
    seed.companies = data.map(
      ({
        id,
        name,
        email,
        phone,
        address,
        city,
        status,
        contacts,
        profiles,
        defaultProfileId,
      }) => ({
        id,
        name,
        email,
        phone,
        address,
        city,
        status,
        contacts,
        profiles,
        defaultProfileId,
      }),
    );
  }
  if (products) {
    const data: unknown = JSON.parse(products);
    if (!Array.isArray(data) || !data.every(validProduct))
      throw Error("Existing product data cannot be imported.");
    seed.products = data;
  }
  if (extras) {
    const data: unknown = JSON.parse(extras);
    if (!validExtraColumns(data))
      throw Error("Existing Excel schema cannot be imported.");
    seed.extraColumns = data;
  }
  seed.sales = [];
  if (quotes) {
    const data: unknown = JSON.parse(quotes);
    if (!Array.isArray(data))
      throw Error("Existing quotations cannot be imported.");
    seed.sales = data.map((q) => {
      if (!record(q) || !Array.isArray(q.lines))
        throw Error(
          "An existing quotation has no item breakdown. Original data has been retained.",
        );
      const lines: Line[] = q.lines.map((l: any) => ({
        id: uid(),
        kind: "product",
        catalogId: l.catalogId,
        itemNo: l.itemNo || "",
        description: l.description,
        quantity: l.quantity,
        unit: l.unit || "Item",
        unitPrice: l.unitPrice,
        attributes: l.attributes || {},
      }));
      if (
        Math.abs(
          totals(lines, q.discount || 0, q.taxRate || 0).total - q.total,
        ) > 0.005
      )
        throw Error("An existing quotation has inconsistent totals.");
      return {
        id: uid(),
        number: q.id,
        title: q.title || "",
        description: q.description || "",
        customerId: q.customerId || "",
        customer: q.customer,
        customerEmail: q.customerEmail || "",
        customerPhone: q.customerPhone || "",
        customerAddress: q.customerAddress || "",
        date: q.date,
        expiry: q.expiry,
        status: q.status,
        lines,
        discount: q.discount || 0,
        taxRate: q.taxRate || 0,
        notes: "",
        recipients: q.recipients || [],
        history: [
          ...(q.statusHistory || []).map((h: any) => ({
            id: uid(),
            date: h.date,
            message: `Status changed to ${h.status}`,
          })),
          event("Imported from previous sales workspace"),
        ],
        isDemo: q.isDemo,
      } as Sale;
    });
  }
  if (!validWorkspace(seed))
    throw Error(
      "Existing data could not be imported safely. The original browser data is unchanged.",
    );
  return seed;
}
