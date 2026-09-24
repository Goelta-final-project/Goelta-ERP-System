import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import * as XLSX from "xlsx";
import { loadSource } from "./load-source.mjs";
const d = loadSource("src/modules/sales/domain/workflow.ts");
const storage = loadSource("src/modules/sales/data/storage.ts");
const excel = loadSource("src/modules/sales/services/excel.ts");
const catalog = loadSource("src/modules/sales/services/catalog-import.ts");
const pdf = loadSource("src/modules/sales/services/pdf.ts");
const sharing = loadSource("src/modules/sales/components/sharing/index.ts");
const fresh = () => storage.seedWorkspace();
function order(s) {
  const q = s.sales[0];
  d.transitionSale(s, q.id, "Accepted");
  return q;
}
function assertValid(s) {
  assert.equal(storage.validWorkspace(s), true, "workspace remains valid");
}
function pdfText(document) {
  const bytes = Buffer.from(document.output("arraybuffer"));
  const text = bytes.toString("latin1");
  return [...text.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((m) => {
      try {
        return inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      } catch {
        return m[1];
      }
    })
    .join("\n");
}

test("seed workspace validates, quotation titles and descriptions survive JSON persistence", () => {
  const s = fresh();
  assertValid(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertValid(copy);
  assert.equal(copy.sales[0].title, s.sales[0].title);
  assert.equal(copy.sales[0].description, s.sales[0].description);
  for (const key of ["title", "description"]) {
    const broken = structuredClone(s);
    broken.sales[0][key] = 42;
    assert.equal(storage.validWorkspace(broken), false);
  }
});
test("quotation create/edit keeps notes, section lines, attributes and recipients", () => {
  const s = fresh();
  const q = d.newSale(s);
  q.title = "New office";
  q.description = "First floor\nSecond floor";
  q.customerId = "1";
  q.lines = [
    { ...d.blankLine("section"), description: "Furniture" },
    {
      ...d.lineFromProduct(s.products[0]),
      attributes: { Warranty: "24 months" },
    },
    { ...d.blankLine("note"), description: "Assembly included" },
  ];
  q.notes = "Call before delivery";
  q.recipients = d.profileRecipients(s.companies[0]);
  d.saveSale(s, q);
  assertValid(s);
  const saved = s.sales.find((row) => row.id === q.id);
  assert.equal(saved.customer, s.companies[0].name);
  assert.equal(saved.recipients.length, 2);
  assert.equal(saved.lines[1].attributes.Warranty, "24 months");
  d.saveSale(s, { ...saved, title: "Revised office" });
  assert.equal(s.sales[0].history.length, 2);
  assert.throws(
    () => d.saveSale(s, { ...q, id: d.uid(), number: q.number.toLowerCase() }),
    /already exists/,
  );
  assert.throws(() => d.saveSale(s, { ...q, expiry: "2020-01-01" }), /Expiry/);
  assert.throws(
    () => d.saveSale(s, { ...q, customerId: "3" }),
    /active customer/,
  );
});
test("invalid quantities, totals, empty products and numeric overflow are rejected", () => {
  const line = {
    ...d.blankLine(),
    description: "Item",
    quantity: 3,
    unitPrice: 0.335,
  };
  assert.deepEqual(d.totals([line], 0, 18), {
    subtotal: 1.01,
    untaxed: 1.01,
    tax: 0.18,
    total: 1.19,
  });
  for (const quantity of [0, -1, NaN, Infinity])
    assert.throws(() => d.totals([{ ...line, quantity }]));
  assert.throws(() => d.totals([line], 2));
  assert.throws(() => d.totals([line], 0, 101));
  assert.throws(() => d.totals([{ ...line, unitPrice: Number.MAX_VALUE }]));
  assert.throws(
    () =>
      d.validateLines([{ ...d.blankLine("note"), description: "Only a note" }]),
    /at least one/,
  );
  assert.equal(d.validDate("2026-02-30"), false);
  assert.equal(d.validDate("2028-02-29"), true);
});
test("confirmation, hold and rejection preserve the quotation lifecycle and lock orders", () => {
  const s = fresh(),
    q = s.sales[0];
  d.transitionSale(s, q.id, "Hold");
  d.transitionSale(s, q.id, "Draft");
  d.transitionSale(s, q.id, "Sent");
  d.transitionSale(s, q.id, "Rejected");
  d.transitionSale(s, q.id, "Draft");
  d.transitionSale(s, q.id, "Accepted");
  assertValid(s);
  assert.throws(
    () => d.saveSale(s, { ...q, title: "Do not change" }),
    /Only draft/,
  );
  assert.throws(() => d.transitionSale(s, q.id, "Sent"), /not allowed/);
  const emptyRecipients = s.sales[3];
  emptyRecipients.recipients = [];
  assert.throws(
    () => d.transitionSale(s, emptyRecipients.id, "Sent"),
    /main email/,
  );
});
test("regular invoice snapshots order lines and blocks duplicate or premature invoices", () => {
  const s = fresh();
  assert.throws(() => d.createInvoice(s, s.sales[0].id, "regular"), /Confirm/);
  const q = order(s);
  const id = d.createInvoice(s, q.id, "regular");
  const i = s.invoices.find((i) => i.id === id);
  assertValid(s);
  assert.equal(i.notes, q.notes);
  assert.equal(
    d.invoiceTotal(i),
    d.totals(q.lines, q.discount, q.taxRate).total,
  );
  assert.notEqual(i.lines, q.lines);
  assert.throws(() => d.createInvoice(s, q.id, "regular"), /existing draft/);
  d.postInvoice(s, id);
  assert.equal(d.invoiceStatus(s, q), "Invoiced");
  assert.throws(() => d.createInvoice(s, q.id, "regular"), /already invoiced/);
  assert.throws(
    () => d.transitionSale(s, q.id, "Cancelled"),
    /linked invoices/,
  );
  assertValid(s);
});
test("down payments carry order tax and are deducted once on the final invoice", () => {
  const s = fresh();
  s.sales[0].taxRate = 18;
  const q = order(s);
  const full = d.totals(q.lines, q.discount, q.taxRate);
  const depositId = d.createInvoice(s, q.id, "percentage", 30);
  const deposit = s.invoices[0];
  assert.equal(deposit.taxRate, 18);
  assert.equal(d.invoiceTotal(deposit), d.roundMoney(full.total * 0.3));
  d.postInvoice(s, depositId);
  const finalId = d.createInvoice(s, q.id, "regular");
  const final = s.invoices.find((i) => i.id === finalId);
  assert.equal(final.deduction, d.invoiceTotal(deposit));
  assert.equal(final.deductionTax, d.totals(deposit.lines, 0, 18).tax);
  assert.equal(
    d.roundMoney(d.invoiceTotal(final) + d.invoiceTotal(deposit)),
    full.total,
  );
  assert.throws(() => d.cancelInvoice(s, depositId), /final invoice/);
  assertValid(s);
});
test("fixed down payment uses an untaxed amount and cannot over-invoice the order", () => {
  const s = fresh();
  s.sales[0].taxRate = 18;
  const q = order(s);
  for (const amount of [0, -1, NaN, Infinity, 1000000])
    assert.throws(() => d.createInvoice(s, q.id, "fixed", amount));
  const id = d.createInvoice(s, q.id, "fixed", 100);
  assert.equal(d.invoiceTotal(s.invoices[0]), 118);
  d.postInvoice(s, id);
  assertValid(s);
});
test("partial and full payments update balances, reject overpayment and cannot be cancelled", () => {
  const s = fresh(),
    q = order(s);
  const id = d.createInvoice(s, q.id, "regular");
  const i = s.invoices[0];
  assert.throws(() => d.registerPayment(s, id, 10, d.dateAfter(), ""), /Post/);
  d.postInvoice(s, id);
  const total = d.invoiceTotal(i);
  d.registerPayment(s, id, 100, d.dateAfter(), "BANK-001");
  assert.equal(d.invoiceLabel(i), "Partially paid");
  assert.equal(d.amountDue(i), total - 100);
  assert.throws(
    () => d.registerPayment(s, id, total, d.dateAfter(), ""),
    /exceed/,
  );
  assert.throws(() => d.registerPayment(s, id, 1, "2020-01-01", ""), /date/);
  d.registerPayment(s, id, d.amountDue(i), d.dateAfter(), "BANK-002");
  assert.equal(d.invoiceLabel(i), "Paid");
  assert.equal(d.amountDue(i), 0);
  assert.throws(() => d.cancelInvoice(s, id), /recorded payments/);
  assert.throws(() => d.registerPayment(s, id, 1, d.dateAfter(), ""), /exceed/);
  assertValid(s);
});
test("cancelling a draft releases invoicing and cancellation cascades are guarded", () => {
  const s = fresh(),
    q = order(s);
  const id = d.createInvoice(s, q.id, "regular");
  d.cancelInvoice(s, id);
  const replacement = d.createInvoice(s, q.id, "regular");
  assert.notEqual(id, replacement);
  d.cancelInvoice(s, replacement);
  d.transitionSale(s, q.id, "Cancelled");
  d.transitionSale(s, q.id, "Draft");
  assertValid(s);
});
test("RFQ uses a vendor and vendor costs, links the order, and receipts add stock exactly once", () => {
  const s = fresh();
  assert.throws(() => d.newPurchase(s, s.sales[0].id), /Confirm/);
  const q = order(s);
  const draft = d.newPurchase(s, q.id);
  assert.equal(draft.lines.length, 2);
  assert.ok(draft.lines.every((l) => l.unitPrice === 0));
  draft.vendor = "Test supplier";
  draft.vendorEmail = "sales@supplier.example";
  draft.lines.forEach((l) => (l.unitPrice = 100));
  d.savePurchase(s, draft);
  assertValid(s);
  assert.throws(() => d.newPurchase(s, q.id), /already has/);
  assert.throws(() => d.transitionSale(s, q.id, "Cancelled"), /linked/);
  const qty = s.products[0].available;
  d.transitionPurchase(s, draft.id, "RFQ Sent");
  d.transitionPurchase(s, draft.id, "Purchase Order");
  assert.equal(s.products[0].available, qty);
  d.transitionPurchase(s, draft.id, "Received");
  assert.equal(s.products[0].available, qty + draft.lines[0].quantity);
  assert.throws(
    () => d.transitionPurchase(s, draft.id, "Received"),
    /not allowed/,
  );
  assert.throws(
    () => d.transitionPurchase(s, draft.id, "Cancelled"),
    /not allowed/,
  );
  assertValid(s);
});
test("independent RFQs validate vendor, dates, lines and duplicate numbers", () => {
  const s = fresh(),
    p = d.newPurchase(s);
  assert.throws(() => d.savePurchase(s, p), /vendor/);
  p.vendor = "Vendor";
  assert.throws(() => d.savePurchase(s, p), /at least one/);
  p.lines = [d.lineFromProduct(s.products[0])];
  p.vendorEmail = "bad";
  assert.throws(() => d.savePurchase(s, p), /email/);
  p.vendorEmail = "";
  d.savePurchase(s, p);
  assertValid(s);
  assert.throws(
    () => d.savePurchase(s, { ...p, id: d.uid() }),
    /already exists/,
  );
});
test("recipient profiles support nameless contacts and deduplicate email addresses", () => {
  const c = fresh().companies[0];
  c.contacts[0].name = "";
  c.contacts.push({
    ...c.contacts[0],
    id: "other",
    email: c.email.toUpperCase(),
  });
  d.validateCompany(c);
  assert.equal(d.recipientOptions(c)[1].name, "Procurement Manager");
  assert.deepEqual(
    d.cleanRecipients(c, "company", ["c1", "other", "missing", "c1"]),
    { to: "company", cc: ["c1"] },
  );
  c.contacts = [];
  assert.throws(() => d.validateCompany(c), /profile/);
});
test("Excel catalog roundtrip preserves configured attributes and rejects invalid headings atomically", () => {
  const book = catalog.createCatalogTemplate(["Brand"]);
  const bytes = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  const loaded = XLSX.read(bytes);
  const products = catalog.parseCatalog(loaded.Sheets.Catalog, ["Brand"]);
  assert.equal(products.length, 2);
  assert.ok(Object.hasOwn(products[0].attributes, "Brand"));
  assert.throws(
    () => catalog.parseCatalog(loaded.Sheets.Catalog, ["Warranty"]),
    /Missing/,
  );
  assert.equal(catalog.validExtraColumns(["Rate"]), false);
});
test("quotation Excel import inserts populated inline rows directly and validates quantities", () => {
  const headers = [
    ...Object.values(catalog.catalogColumns),
    "Brand",
    "Quantity",
  ];
  const row = [
    "1.1",
    "PRD-001",
    "Product",
    "Imported workstation",
    "Furniture",
    "Item",
    500,
    25,
    "Goelta",
    3,
  ];
  const sheet = XLSX.utils.aoa_to_sheet([headers, row]);
  const lines = excel.parseQuotationLines(sheet, ["Brand"], fresh().products);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 3);
  assert.equal(lines[0].catalogId, "PRD-001");
  assert.equal(lines[0].attributes.Brand, "Goelta");
  assert.equal(d.totals(lines).total, 1500);
  for (const qty of [0, -1, "no", true, ""]) {
    const bad = [...row];
    bad[9] = qty;
    assert.throws(() =>
      excel.parseQuotationLines(
        XLSX.utils.aoa_to_sheet([headers, bad]),
        ["Brand"],
        [],
      ),
    );
  }
});
test("PDF contains quotation title/description, notes, attributes and no quotation status", () => {
  const q = fresh().sales[0];
  q.title = "Office furniture";
  q.description = "Supply and installation";
  q.notes = "Site access\nNotify reception";
  q.lines[0].attributes = { Warranty: "24 months" };
  const doc = pdf.documentPdf(q, "sale");
  const content = pdfText(doc);
  assert.match(content, /Office furniture/);
  assert.match(content, /Supply and installation/);
  assert.match(content, /Notify reception/);
  assert.match(content, /Warranty: 24 months/);
  assert.doesNotMatch(content, /\(Draft\)|\(Status\)/);
  assert.ok(doc.output("arraybuffer").byteLength > 1000);
  const long = {
    ...q,
    description: "A long description. ".repeat(180),
    notes: "Delivery notes with enough text to wrap. ".repeat(150),
    lines: Array.from({ length: 80 }, (_, idx) => ({
      ...q.lines[0],
      id: d.uid(),
      description: `Product ${idx}: supplied and installed at the customer premises.`,
    })),
  };
  assert.ok(pdf.documentPdf(long, "sale").getNumberOfPages() > 3);
});
test("invoice PDF includes notes before totals and handles down-payment deductions", () => {
  const s = fresh(),
    q = order(s);
  const dep = d.createInvoice(s, q.id, "fixed", 100);
  d.postInvoice(s, dep);
  d.createInvoice(s, q.id, "regular");
  const i = s.invoices[0];
  i.notes = "Invoice delivery note";
  const content = pdfText(pdf.documentPdf(i, "invoice"));
  assert.match(content, /Invoice delivery note/);
  assert.match(content, /Down payments/);
  assert.ok(
    content.indexOf("Invoice delivery note") < content.indexOf("Down payments"),
  );
});
test("email drafts escape headers and do not duplicate recipients", () => {
  const url = new URL(
    sharing.buildMailto(
      "sales@example.com",
      ["CC@example.com", "cc@example.com", "sales@example.com"],
      "Quote & rates",
      "Line 1\nLine 2",
    ),
  );
  assert.equal(url.searchParams.get("cc"), "cc@example.com");
  assert.equal(url.searchParams.get("body"), "Line 1\nLine 2");
  assert.throws(() =>
    sharing.buildMailto("a@b.com\r\nBcc:c@d.com", [], "Hello", ""),
  );
  assert.throws(() =>
    sharing.buildMailto("a@b.com", [], "Hello\nInjected", ""),
  );
});
test("legacy migration removes subcontract fields without overwriting source data", () => {
  const seed = fresh();
  const c = {
    ...seed.companies[0],
    subcontracts: [{ id: "old", name: "Old project" }],
  };
  const sale = seed.sales[0];
  const q = {
    id: "SQ-OLD",
    customerId: c.id,
    customer: c.name,
    title: sale.title,
    description: sale.description,
    date: sale.date,
    expiry: sale.expiry,
    total: d.totals(sale.lines).total,
    status: "Draft",
    lines: sale.lines,
    subcontractId: "old",
    subcontract: "Old project",
  };
  const values = new Map([
    ["goelta.customer-companies.v1", JSON.stringify([c])],
    ["goelta.quotations.v1", JSON.stringify([q])],
  ]);
  const before = JSON.stringify([...values]);
  const migrated = storage.initialWorkspace({
    getItem: (key) => values.get(key) ?? null,
  });
  assertValid(migrated);
  assert.equal(migrated.sales[0].number, "SQ-OLD");
  assert.equal(migrated.sales[0].title, sale.title);
  assert.equal("subcontracts" in migrated.companies[0], false);
  assert.equal("subcontractId" in migrated.sales[0], false);
  assert.equal(JSON.stringify([...values]), before);
});
test("storage rejects corrupt structures, orphan links, mismatched totals and duplicate IDs", () => {
  const s = fresh();
  assert.equal(storage.validWorkspace(null), false);
  assert.equal(storage.validWorkspace({ ...s, sales: [null] }), false);
  assert.equal(
    storage.validWorkspace({
      ...s,
      companies: [s.companies[0], s.companies[0]],
    }),
    false,
  );
  const q = order(s);
  d.createInvoice(s, q.id, "regular");
  const broken = structuredClone(s);
  broken.invoices[0].saleId = "missing";
  assert.equal(storage.validWorkspace(broken), false);
  broken.invoices[0].saleId = q.id;
  broken.invoices[0].deduction = 999999;
  assert.equal(storage.validWorkspace(broken), false);
  assert.throws(() =>
    storage.initialWorkspace({
      getItem: (key) => (key === "goelta.quotations.v1" ? "{broken" : null),
    }),
  );
});
test("stock warning adds repeated product quantities but allows unlimited services", () => {
  const s = fresh();
  const l = d.lineFromProduct(s.products[0]);
  const lines = [
    { ...l, quantity: 10 },
    { ...l, id: d.uid(), quantity: 10 },
    { ...d.lineFromProduct(s.products[2]), quantity: 10000 },
  ];
  assert.equal(d.stockWarnings(lines, s.products).length, 1);
  assert.match(d.stockWarnings(lines, s.products)[0], /20 ordered, 18 on hand/);
});
