import {
  dateAfter,
  event,
  nextNumber,
  productLines,
  totals,
  uid,
  validateLines,
  validateRecipients,
  validDate,
} from "./common";
import type { CatalogItem, Line, Sale, SaleStatus, Workspace } from "./types";

export function newSale(state: Workspace): Sale {
  return {
    id: uid(),
    number: nextNumber("S", state.sales),
    title: "",
    description: "",
    customerId: "",
    customer: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    date: dateAfter(),
    expiry: dateAfter(30),
    status: "Draft",
    lines: [],
    discount: 0,
    taxRate: 0,
    notes: "",
    recipients: [],
    history: [],
  };
}

export function saveSale(state: Workspace, draft: Sale) {
  const previous = state.sales.find((s) => s.id === draft.id);
  if (previous && previous.status !== "Draft")
    throw Error("Only draft quotations can be edited.");
  if (draft.status !== "Draft")
    throw Error("Save a draft before changing its status.");
  const company = state.companies.find(
    (c) => c.id === draft.customerId && c.status === "Active",
  );
  if (!company) throw Error("Select an active customer.");
  if (!draft.title.trim() || !draft.number.trim())
    throw Error("Quotation number and title are required.");
  if (
    !validDate(draft.date) ||
    !validDate(draft.expiry) ||
    draft.expiry < draft.date
  )
    throw Error("Expiry must be on or after the quotation date.");
  if (
    state.sales.some(
      (s) =>
        s.id !== draft.id &&
        s.number.toLowerCase() === draft.number.trim().toLowerCase(),
    )
  )
    throw Error("That quotation number already exists.");
  validateLines(draft.lines);
  validateRecipients(draft.recipients);
  totals(draft.lines, draft.discount, draft.taxRate);
  const saved: Sale = {
    ...structuredClone(draft),
    number: draft.number.trim(),
    title: draft.title.trim(),
    customer: company.name,
    customerEmail: company.email,
    customerPhone: company.phone,
    customerAddress: [company.address, company.city].filter(Boolean).join(", "),
    history: [
      ...(previous?.history || []),
      event(previous ? "Quotation updated" : "Quotation created"),
    ],
  };
  state.sales = previous
    ? state.sales.map((s) => (s.id === saved.id ? saved : s))
    : [saved, ...state.sales];
}

export function transitionSale(
  state: Workspace,
  id: string,
  status: SaleStatus,
) {
  const sale = state.sales.find((s) => s.id === id);
  if (!sale) throw Error("Quotation not found.");
  const allowed: Record<SaleStatus, SaleStatus[]> = {
    Draft: ["Sent", "Hold", "Accepted", "Cancelled"],
    Sent: ["Accepted", "Rejected", "Hold", "Cancelled"],
    Hold: ["Draft", "Sent", "Accepted", "Rejected", "Cancelled"],
    Accepted: ["Cancelled"],
    Rejected: ["Draft"],
    Cancelled: ["Draft"],
  };
  if (!allowed[sale.status].includes(status))
    throw Error("This status change is not allowed.");
  if (status === "Sent" && !sale.recipients.some((r) => r.role === "To"))
    throw Error("Choose a main email recipient first.");
  if (status === "Accepted") {
    validateLines(sale.lines);
    if (
      !state.companies.some(
        (c) => c.id === sale.customerId && c.status === "Active",
      )
    )
      throw Error("Activate this customer before confirming the order.");
  }
  if (
    status === "Cancelled" &&
    (state.invoices.some((i) => i.saleId === id && i.status !== "Cancelled") ||
      state.purchases.some((p) => p.saleId === id && p.status !== "Cancelled"))
  )
    throw Error(
      "Cancel linked invoices and purchases before cancelling this sales order.",
    );
  sale.status = status;
  sale.history.push(
    event(
      status === "Accepted"
        ? "Quotation confirmed as a sales order"
        : `Status changed to ${status}`,
    ),
  );
}

export function stockWarnings(lines: Line[], products: CatalogItem[]) {
  const quantities = new Map<string, number>();
  for (const l of productLines(lines))
    if (l.catalogId)
      quantities.set(
        l.catalogId,
        (quantities.get(l.catalogId) || 0) + l.quantity,
      );
  return [...quantities].flatMap(([id, qty]) => {
    const p = products.find((p) => p.id === id);
    return !p
      ? [`${id} is no longer in the catalog.`]
      : p.available !== null && qty > p.available
        ? [`${p.description}: ${qty} ordered, ${p.available} on hand.`]
        : [];
  });
}
