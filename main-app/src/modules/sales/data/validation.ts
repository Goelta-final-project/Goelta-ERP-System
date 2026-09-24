import type { CatalogItem, Company, Line, Workspace } from "../domain/types";
import {
  amountDue,
  invoiceTotal,
  totals,
  validDate,
  validateCompany,
  validateLines,
  validateRecipients,
} from "../domain/workflow";
import { validExtraColumns } from "../services/catalog-schema";

export const record = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const strings = (v: Record<string, any>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");

const unique = (v: { id: string }[]) =>
  new Set(v.map((x) => x.id.toLowerCase())).size === v.length;

const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

const attributes = (v: unknown) =>
  record(v) &&
  Object.values(v).every((x) => typeof x === "string" || finite(x));

const history = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      record(e) &&
      strings(e, ["id", "date", "message"]) &&
      Number.isFinite(Date.parse(e.date)),
  );

export function validCompany(c: unknown): c is Company {
  try {
    if (
      !record(c) ||
      !strings(c, [
        "id",
        "name",
        "email",
        "phone",
        "address",
        "city",
        "defaultProfileId",
      ]) ||
      !["Active", "Inactive"].includes(c.status)
    )
      return false;
    if (
      !Array.isArray(c.contacts) ||
      !c.contacts.every(
        (p: unknown) =>
          record(p) && strings(p, ["id", "name", "position", "email", "phone"]),
      )
    )
      return false;
    if (
      !Array.isArray(c.profiles) ||
      !c.profiles.every(
        (p: unknown) =>
          record(p) &&
          strings(p, ["id", "name", "to"]) &&
          Array.isArray(p.cc) &&
          p.cc.every((s: unknown) => typeof s === "string"),
      )
    )
      return false;
    validateCompany(c as Company);
    return true;
  } catch {
    return false;
  }
}

export function validProduct(p: unknown): p is CatalogItem {
  return (
    record(p) &&
    strings(p, ["id", "itemNo", "description", "category", "unit", "name"]) &&
    [p.id, p.description, p.unit].every((s) => s.trim()) &&
    finite(p.rate) &&
    p.rate >= 0 &&
    p.rate * 100 <= Number.MAX_SAFE_INTEGER &&
    p.price === p.rate &&
    (p.type === "Service"
      ? p.available === null
      : p.type === "Product" &&
        finite(p.available) &&
        p.available >= 0 &&
        p.available <= Number.MAX_SAFE_INTEGER) &&
    attributes(p.attributes)
  );
}

function validLines(v: unknown): v is Line[] {
  return (
    Array.isArray(v) &&
    v.every(
      (l) =>
        record(l) &&
        strings(l, ["id", "kind", "itemNo", "description", "unit"]) &&
        (l.catalogId === undefined || typeof l.catalogId === "string") &&
        finite(l.quantity) &&
        finite(l.unitPrice) &&
        attributes(l.attributes),
    ) &&
    (() => {
      try {
        validateLines(v);
        return true;
      } catch {
        return false;
      }
    })()
  );
}

export function validWorkspace(value: unknown): value is Workspace {
  try {
    if (
      !record(value) ||
      value.version !== 1 ||
      !["companies", "products", "sales", "invoices", "purchases"].every(
        (k) =>
          Array.isArray(value[k]) &&
          value[k].every(
            (r: unknown) => record(r) && typeof r.id === "string" && !!r.id,
          ) &&
          unique(value[k]),
      )
    )
      return false;
    const s = value as Workspace;
    if (
      !validExtraColumns(s.extraColumns) ||
      !s.companies.every(validCompany) ||
      !s.products.every(validProduct)
    )
      return false;
    for (const collection of [s.sales, s.invoices, s.purchases])
      if (
        collection.some(
          (r) => typeof r.number !== "string" || !r.number.trim(),
        ) ||
        new Set(collection.map((r) => r.number.toLowerCase())).size !==
          collection.length
      )
        return false;
    for (const q of s.sales) {
      if (
        !strings(q, [
          "number",
          "title",
          "description",
          "customerId",
          "customer",
          "customerEmail",
          "customerPhone",
          "customerAddress",
          "date",
          "expiry",
          "notes",
        ]) ||
        ![
          "Draft",
          "Sent",
          "Hold",
          "Accepted",
          "Rejected",
          "Cancelled",
        ].includes(q.status) ||
        !validDate(q.date) ||
        !validDate(q.expiry) ||
        q.expiry < q.date ||
        !validLines(q.lines) ||
        !history(q.history) ||
        !finite(q.discount) ||
        !finite(q.taxRate) ||
        !Array.isArray(q.recipients) ||
        !q.recipients.every((r) => record(r) && strings(r, ["role", "email"]))
      )
        return false;
      validateRecipients(q.recipients);
      totals(q.lines, q.discount, q.taxRate);
    }
    for (const i of s.invoices) {
      if (
        !strings(i, [
          "number",
          "saleId",
          "customer",
          "customerAddress",
          "customerEmail",
          "date",
          "dueDate",
          "notes",
        ]) ||
        !s.sales.some((q) => q.id === i.saleId) ||
        !["Draft", "Posted", "Cancelled"].includes(i.status) ||
        !["regular", "downpayment"].includes(i.kind) ||
        !validDate(i.date) ||
        !validDate(i.dueDate) ||
        i.dueDate < i.date ||
        !validLines(i.lines) ||
        !finite(i.discount) ||
        !finite(i.taxRate) ||
        !finite(i.deduction) ||
        i.deduction < 0 ||
        !finite(i.deductionTax) ||
        i.deductionTax < 0 ||
        i.deductionTax > i.deduction ||
        i.deductionTax > totals(i.lines, i.discount, i.taxRate).tax ||
        !history(i.history) ||
        !Array.isArray(i.payments)
      )
        return false;
      if (
        !i.payments.every(
          (p) =>
            record(p) &&
            strings(p, ["id", "date", "reference"]) &&
            validDate(p.date) &&
            p.date >= i.date &&
            finite(p.amount) &&
            p.amount > 0,
        ) ||
        !unique(i.payments) ||
        (i.status !== "Posted" && i.payments.length) ||
        invoiceTotal(i) < 0 ||
        amountDue(i) < 0
      )
        return false;
    }
    for (const p of s.purchases) {
      if (
        !strings(p, [
          "number",
          "vendor",
          "vendorEmail",
          "date",
          "expectedDate",
          "notes",
        ]) ||
        !p.vendor.trim() ||
        (p.saleId && !s.sales.some((q) => q.id === p.saleId)) ||
        ![
          "RFQ",
          "RFQ Sent",
          "Purchase Order",
          "Received",
          "Cancelled",
        ].includes(p.status) ||
        !validDate(p.date) ||
        !validDate(p.expectedDate) ||
        p.expectedDate < p.date ||
        !validLines(p.lines) ||
        !finite(p.taxRate) ||
        !history(p.history)
      )
        return false;
      totals(p.lines, 0, p.taxRate);
    }
    for (const sale of s.sales) {
      const active = s.invoices.filter(
        (i) => i.saleId === sale.id && i.status !== "Cancelled",
      );
      if (
        active.filter((i) => i.kind === "regular").length > 1 ||
        active.filter((i) => i.status === "Draft").length > 1 ||
        active.reduce((sum, i) => sum + invoiceTotal(i), 0) -
          totals(sale.lines, sale.discount, sale.taxRate).total >
          0.005
      )
        return false;
      if (
        sale.status !== "Accepted" &&
        (active.length ||
          s.purchases.some(
            (p) => p.saleId === sale.id && p.status !== "Cancelled",
          ))
      )
        return false;
      if (
        s.purchases.filter(
          (p) => p.saleId === sale.id && p.status !== "Cancelled",
        ).length > 1
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
