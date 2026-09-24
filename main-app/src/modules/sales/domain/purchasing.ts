import {
  dateAfter,
  event,
  nextNumber,
  productLines,
  totals,
  uid,
  validateLines,
  validDate,
  validEmail,
} from "./common";
import type { Purchase, Workspace } from "./types";

export function newPurchase(state: Workspace, saleId?: string): Purchase {
  const sale = state.sales.find((s) => s.id === saleId);
  if (saleId && (!sale || sale.status !== "Accepted"))
    throw Error("Confirm the sales order before creating an RFQ.");
  if (
    saleId &&
    state.purchases.some((p) => p.saleId === saleId && p.status !== "Cancelled")
  )
    throw Error(
      "This sales order already has a purchase. Open it from the Purchase smart button.",
    );
  return {
    id: uid(),
    number: nextNumber("P", state.purchases),
    saleId,
    vendor: "",
    vendorEmail: "",
    date: dateAfter(),
    expectedDate: dateAfter(14),
    status: "RFQ",
    lines: sale
      ? productLines(sale.lines)
          .filter(
            (l) =>
              state.products.find((p) => p.id === l.catalogId)?.type !==
              "Service",
          )
          .map((l) => ({ ...structuredClone(l), id: uid(), unitPrice: 0 }))
      : [],
    taxRate: 0,
    notes: "",
    history: [],
  };
}

export function savePurchase(state: Workspace, draft: Purchase) {
  const previous = state.purchases.find((p) => p.id === draft.id);
  if (previous && previous.status !== "RFQ")
    throw Error("Only an RFQ can be edited.");
  if (draft.status !== "RFQ" || !draft.vendor.trim() || !draft.number.trim())
    throw Error("Enter an RFQ number and vendor.");
  if (draft.vendorEmail && !validEmail(draft.vendorEmail))
    throw Error("Enter a valid vendor email.");
  if (
    !validDate(draft.date) ||
    !validDate(draft.expectedDate) ||
    draft.expectedDate < draft.date
  )
    throw Error("Expected arrival must be on or after the order date.");
  if (
    state.purchases.some(
      (p) =>
        p.id !== draft.id &&
        p.number.toLowerCase() === draft.number.trim().toLowerCase(),
    )
  )
    throw Error("That purchase number already exists.");
  if (
    draft.saleId &&
    (!state.sales.some(
      (s) => s.id === draft.saleId && s.status === "Accepted",
    ) ||
      state.purchases.some(
        (p) =>
          p.id !== draft.id &&
          p.saleId === draft.saleId &&
          p.status !== "Cancelled",
      ))
  )
    throw Error("This sales order is unavailable or already has a purchase.");
  validateLines(draft.lines);
  totals(draft.lines, 0, draft.taxRate);
  const saved = {
    ...structuredClone(draft),
    vendor: draft.vendor.trim(),
    number: draft.number.trim(),
    history: [
      ...(previous?.history || []),
      event(previous ? "RFQ updated" : "RFQ created"),
    ],
  };
  state.purchases = previous
    ? state.purchases.map((p) => (p.id === saved.id ? saved : p))
    : [saved, ...state.purchases];
}

export function transitionPurchase(
  state: Workspace,
  id: string,
  status: Purchase["status"],
) {
  const p = state.purchases.find((p) => p.id === id);
  if (!p) throw Error("Purchase not found.");
  const allowed: Record<Purchase["status"], Purchase["status"][]> = {
    RFQ: ["RFQ Sent", "Purchase Order", "Cancelled"],
    "RFQ Sent": ["RFQ", "Purchase Order", "Cancelled"],
    "Purchase Order": ["Received", "Cancelled"],
    Received: [],
    Cancelled: [],
  };
  if (!allowed[p.status].includes(status))
    throw Error("This purchase status change is not allowed.");
  if (status === "Received")
    for (const l of productLines(p.lines)) {
      const product = state.products.find((item) => item.id === l.catalogId);
      if (product && product.available !== null)
        product.available += l.quantity;
    }
  p.status = status;
  p.history.push(
    event(
      status === "Received"
        ? "Products received; stock updated"
        : `Status changed to ${status}`,
    ),
  );
}
