import {
  blankLine,
  dateAfter,
  event,
  money,
  nextNumber,
  roundMoney,
  totals,
  uid,
  validDate,
} from "./common";
import type { Invoice, Sale, Workspace } from "./types";

export const invoiceTotal = (i: Invoice) =>
  roundMoney(totals(i.lines, i.discount, i.taxRate).total - i.deduction);

export const paidAmount = (i: Invoice) =>
  roundMoney(i.payments.reduce((sum, p) => sum + p.amount, 0));

export const amountDue = (i: Invoice) =>
  roundMoney(invoiceTotal(i) - paidAmount(i));

export const invoiceLabel = (i: Invoice) =>
  i.status === "Posted"
    ? amountDue(i) <= 0
      ? "Paid"
      : paidAmount(i) > 0
        ? "Partially paid"
        : "Posted"
    : i.status;

export function invoiceStatus(state: Workspace, sale: Sale) {
  const active = state.invoices.filter(
    (i) => i.saleId === sale.id && i.status !== "Cancelled",
  );
  return active.some((i) => i.kind === "regular" && i.status === "Posted")
    ? "Invoiced"
    : active.some((i) => i.status === "Draft")
      ? "Draft invoice"
      : active.length
        ? "Down payment"
        : "To invoice";
}

export function createInvoice(
  state: Workspace,
  saleId: string,
  kind: "regular" | "percentage" | "fixed",
  amount = 0,
) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale || sale.status !== "Accepted")
    throw Error("Confirm the sales order before creating an invoice.");
  const active = state.invoices.filter(
    (i) => i.saleId === saleId && i.status !== "Cancelled",
  );
  if (active.some((i) => i.status === "Draft"))
    throw Error("Post or cancel the existing draft invoice first.");
  if (active.some((i) => i.kind === "regular"))
    throw Error("This order is already invoiced.");
  const full = totals(sale.lines, sale.discount, sale.taxRate).total;
  const deposits = roundMoney(
    active.reduce((sum, i) => sum + invoiceTotal(i), 0),
  );
  const depositTax = roundMoney(
    active.reduce(
      (sum, i) => sum + totals(i.lines, i.discount, i.taxRate).tax,
      0,
    ),
  );
  const remaining = roundMoney(full - deposits);
  let lines = structuredClone(sale.lines),
    discount = sale.discount,
    taxRate = sale.taxRate,
    deduction = deposits,
    deductionTax = depositTax;
  if (kind !== "regular") {
    const value = roundMoney(
      kind === "percentage"
        ? (totals(sale.lines, sale.discount, sale.taxRate).untaxed * amount) /
            100
        : amount,
    );
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (kind === "percentage" && amount > 100) ||
      value <= 0
    )
      throw Error(
        "Enter a positive down payment amount or a percentage up to 100.",
      );
    lines = [
      {
        ...blankLine(),
        description: `Down payment for ${sale.number}`,
        quantity: 1,
        unitPrice: value,
      },
    ];
    discount = 0;
    deduction = 0;
    deductionTax = 0;
    if (totals(lines, 0, taxRate).total > remaining)
      throw Error(
        "The down payment, including tax, cannot exceed the uninvoiced amount.",
      );
  }
  const invoice: Invoice = {
    id: uid(),
    number: nextNumber("INV/", state.invoices),
    saleId,
    customer: sale.customer,
    customerAddress: sale.customerAddress,
    customerEmail: sale.customerEmail,
    date: dateAfter(),
    dueDate: dateAfter(30),
    status: "Draft",
    kind: kind === "regular" ? "regular" : "downpayment",
    lines,
    discount,
    taxRate,
    deduction,
    deductionTax,
    notes: sale.notes,
    payments: [],
    history: [event("Draft invoice created from " + sale.number)],
  };
  state.invoices.unshift(invoice);
  sale.history.push(event(`Created invoice ${invoice.number}`));
  return invoice.id;
}

export function postInvoice(state: Workspace, id: string) {
  const i = state.invoices.find((i) => i.id === id);
  if (!i || i.status !== "Draft")
    throw Error("Only a draft invoice can be posted.");
  if (!validDate(i.date) || !validDate(i.dueDate) || i.dueDate < i.date)
    throw Error("The due date must be on or after the invoice date.");
  i.status = "Posted";
  i.history.push(event("Invoice posted"));
}

export function cancelInvoice(state: Workspace, id: string) {
  const i = state.invoices.find((i) => i.id === id);
  if (!i || i.status === "Cancelled")
    throw Error("Invoice is already cancelled.");
  if (i.payments.length)
    throw Error("An invoice with recorded payments cannot be cancelled.");
  if (
    i.kind === "downpayment" &&
    state.invoices.some(
      (other) =>
        other.saleId === i.saleId &&
        other.kind === "regular" &&
        other.status !== "Cancelled",
    )
  )
    throw Error("Cancel the final invoice before cancelling its down payment.");
  i.status = "Cancelled";
  i.history.push(event("Invoice cancelled"));
}

export function registerPayment(
  state: Workspace,
  id: string,
  amount: number,
  date: string,
  reference: string,
) {
  const i = state.invoices.find((i) => i.id === id);
  if (!i || i.status !== "Posted")
    throw Error("Post the invoice before registering payment.");
  amount = roundMoney(amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > amountDue(i))
    throw Error("Payment must be positive and cannot exceed the amount due.");
  if (!validDate(date) || date < i.date)
    throw Error("Payment date must be on or after the invoice date.");
  i.payments.push({ id: uid(), date, amount, reference: reference.trim() });
  i.history.push(event(`Payment registered: ${money(amount)}`));
}
