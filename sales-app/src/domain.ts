import type {
  CatalogItem,
  Company,
  Invoice,
  Line,
  Purchase,
  Recipient,
  Sale,
  SaleStatus,
  Workspace,
} from "./model";

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
export function recipientOptions(c: Company) {
  return [
    { id: "company", name: c.name, email: c.email },
    ...c.contacts.map((p) => ({
      id: p.id,
      name: p.name || p.position || "Contact",
      email: p.email,
    })),
  ].filter((p) => validEmail(p.email));
}
export function cleanRecipients(c: Company, to: string, cc: string[]) {
  const opts = recipientOptions(c);
  const main = opts.find((p) => p.id === to);
  const seen = new Set(main ? [main.email.toLowerCase()] : []);
  return {
    to: main?.id || "",
    cc: cc.filter((id) => {
      const p = opts.find((p) => p.id === id);
      if (!p || seen.has(p.email.toLowerCase())) return false;
      seen.add(p.email.toLowerCase());
      return true;
    }),
  };
}
export function profileRecipients(
  c: Company,
  profileId = c.defaultProfileId,
): Recipient[] {
  const profile = c.profiles.find((p) => p.id === profileId);
  const ids = cleanRecipients(
    c,
    profile?.to || (c.email ? "company" : ""),
    profile?.cc || [],
  );
  return recipientOptions(c)
    .filter((p) => p.id === ids.to || ids.cc.includes(p.id))
    .map((p) => ({
      role: p.id === ids.to ? "To" : "CC",
      email: p.email,
      name: p.name,
    }));
}
export function validateCompany(c: Company) {
  if (!c.id || !c.name.trim()) throw Error("Company name is required.");
  for (const p of [c, ...c.contacts]) {
    if (p.email && !validEmail(p.email))
      throw Error("Enter a valid email address or leave it empty.");
    if (
      p.phone &&
      (!/^[+\d\s().-]+$/.test(p.phone) || p.phone.replace(/\D/g, "").length < 7)
    )
      throw Error("Enter a valid phone number or leave it empty.");
  }
  if (
    c.contacts.some(
      (p) => ![p.name, p.position, p.email, p.phone].some((s) => s.trim()),
    )
  )
    throw Error("Each contact needs a name, position, email or phone.");
  if (
    new Set(c.contacts.map((p) => p.id)).size !== c.contacts.length ||
    c.contacts.some((p) => !p.id || p.id === "company")
  )
    throw Error("Contact IDs must be unique.");
  if (
    new Set(c.profiles.map((p) => p.id)).size !== c.profiles.length ||
    new Set(c.profiles.map((p) => p.name.trim().toLowerCase())).size !==
      c.profiles.length
  )
    throw Error("Recipient profiles must have unique names.");
  if (
    c.profiles.some(
      (p) =>
        !p.id ||
        !p.name.trim() ||
        !cleanRecipients(c, p.to, p.cc).to ||
        cleanRecipients(c, p.to, p.cc).cc.length !== p.cc.length,
    )
  )
    throw Error(
      "Each profile needs a name, a valid main recipient, and unique CC recipients.",
    );
  if (
    c.defaultProfileId &&
    !c.profiles.some((p) => p.id === c.defaultProfileId)
  )
    throw Error("Select a valid default recipient profile.");
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
