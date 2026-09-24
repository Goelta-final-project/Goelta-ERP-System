import type { CatalogItem, Line, Recipient } from "./types";

export const uid = () => crypto.randomUUID();

export const roundMoney = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

export const validEmail = (s: string) =>
  /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(s);

export function dateAfter(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function validDate(s: string) {
  const d = new Date(s + "T00:00:00Z");
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(d.getTime()) &&
    d.toISOString().slice(0, 10) === s
  );
}

export const productLines = (lines: Line[]) =>
  lines.filter((l) => l.kind === "product");

export function totals(
  lines: Pick<Line, "kind" | "quantity" | "unitPrice">[],
  discount = 0,
  taxRate = 0,
) {
  const products = lines.filter((l) => l.kind === "product");
  if (
    products.some(
      (l) =>
        !Number.isFinite(l.quantity) ||
        l.quantity <= 0 ||
        !Number.isFinite(l.unitPrice) ||
        l.unitPrice < 0,
    )
  )
    throw Error(
      "Every product needs a positive quantity and a non-negative unit price.",
    );
  const subtotal = roundMoney(
    products.reduce((sum, l) => sum + roundMoney(l.quantity * l.unitPrice), 0),
  );
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal)
    throw Error("Discount must be between zero and the subtotal.");
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
    throw Error("Tax must be between 0 and 100%.");
  const untaxed = roundMoney(subtotal - discount),
    tax = roundMoney((untaxed * taxRate) / 100),
    total = roundMoney(untaxed + tax);
  if (
    ![subtotal, untaxed, tax, total].every(
      (n) => Number.isFinite(n) && n * 100 <= Number.MAX_SAFE_INTEGER,
    )
  )
    throw Error("Amounts are too large.");
  return { subtotal, untaxed, tax, total };
}

export function blankLine(kind: Line["kind"] = "product"): Line {
  return {
    id: uid(),
    kind,
    itemNo: "",
    description: "",
    quantity: 1,
    unit: "Item",
    unitPrice: 0,
    attributes: {},
  };
}

export function lineFromProduct(p: CatalogItem): Line {
  return {
    ...blankLine(),
    catalogId: p.id,
    itemNo: p.itemNo,
    description: p.description,
    unit: p.unit,
    unitPrice: p.rate,
    attributes: { ...p.attributes },
  };
}

export function nextNumber(prefix: string, records: { number: string }[]) {
  const numbers = records.flatMap((r) => {
    const suffix = r.number.slice(prefix.length);
    return r.number.toLowerCase().startsWith(prefix.toLowerCase()) &&
      /^\d+$/.test(suffix) &&
      Number.isSafeInteger(Number(suffix))
      ? [Number(suffix)]
      : [];
  });
  const next = numbers.reduce((max, n) => Math.max(max, n), 0) + 1;
  if (!Number.isSafeInteger(next))
    throw Error("The document number sequence is exhausted.");
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export function event(message: string) {
  return { id: uid(), date: new Date().toISOString(), message };
}

export function validateLines(lines: Line[]) {
  if (!productLines(lines).length)
    throw Error("Add at least one product or service.");
  if (new Set(lines.map((l) => l.id)).size !== lines.length)
    throw Error("Line IDs must be unique.");
  if (
    lines.some(
      (l) =>
        !l.id ||
        !["product", "section", "note"].includes(l.kind) ||
        !l.description.trim() ||
        (l.kind === "product" && !l.unit.trim()),
    )
  )
    throw Error(
      "Every line needs a description; product lines also need a unit.",
    );
  totals(lines);
}

export function validateRecipients(recipients: Recipient[]) {
  if (
    recipients.some(
      (r) => !["To", "CC"].includes(r.role) || !validEmail(r.email),
    ) ||
    recipients.filter((r) => r.role === "To").length > 1 ||
    new Set(recipients.map((r) => r.email.toLowerCase())).size !==
      recipients.length
  )
    throw Error(
      "Check the main recipient and remove duplicate or invalid email addresses.",
    );
}
