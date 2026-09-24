import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Invoice, Purchase, Sale } from "../domain/types";
import {
  invoiceTotal,
  money,
  roundMoney,
  totals,
  validateLines,
} from "../domain/workflow";
export type DocumentKind = "sale" | "invoice" | "purchase";
export type Document = Sale | Invoice | Purchase;
export function documentPdf(record: Document, kind: DocumentKind) {
  validateLines(record.lines);
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const sale = kind === "sale" ? (record as Sale) : undefined;
  const invoice = kind === "invoice" ? (record as Invoice) : undefined;
  const purchase = kind === "purchase" ? (record as Purchase) : undefined;
  const heading = sale
    ? sale.status === "Accepted"
      ? "SALES ORDER"
      : "SALES QUOTATION"
    : invoice
      ? "CUSTOMER INVOICE"
      : purchase?.status === "RFQ" || purchase?.status === "RFQ Sent"
        ? "REQUEST FOR QUOTATION"
        : "PURCHASE ORDER";
  const discount = sale?.discount ?? invoice?.discount ?? 0;
  const calculated = totals(record.lines, discount, record.taxRate);
  doc.setProperties({
    title: `GOELTA ${heading} ${record.number}`,
    author: "GOELTA",
  });
  const margins = { top: 40, bottom: 22, left: 16, right: 16 };
  const info = [
    ["Reference", record.number],
    ["Date", record.date],
  ];
  if (sale)
    info.push(
      ["Title", sale.title || record.number],
      ["Description", sale.description || ""],
      ["Valid until", sale.expiry],
      ["Customer", sale.customer],
      ["Address", sale.customerAddress],
      [
        "Email / phone",
        [sale.customerEmail, sale.customerPhone].filter(Boolean).join(" / "),
      ],
    );
  if (invoice)
    info.push(
      ["Customer", invoice.customer],
      ["Address", invoice.customerAddress],
      ["Email", invoice.customerEmail],
      ["Due date", invoice.dueDate],
    );
  if (purchase)
    info.push(
      ["Vendor", purchase.vendor],
      ["Email", purchase.vendorEmail],
      ["Expected arrival", purchase.expectedDate],
    );
  autoTable(doc, {
    startY: 42,
    margin: margins,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 34, textColor: [100, 100, 110] } },
    body: info.filter(([, v]) => !!v),
  });
  const lastY = () =>
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: lastY() + 8,
    margin: margins,
    head: [
      [
        "Item",
        "Description",
        "Qty",
        "Unit",
        purchase ? "Unit cost" : "Unit price",
        "Amount",
      ],
    ],
    body: record.lines.map((l, idx) =>
      l.kind !== "product"
        ? [
            {
              content: l.description,
              colSpan: 6,
              styles: {
                fontStyle: l.kind === "section" ? "bold" : "italic",
                fillColor:
                  l.kind === "section" ? [241, 236, 240] : [255, 255, 255],
              },
            },
          ]
        : [
            l.itemNo || String(idx + 1),
            [
              l.description,
              ...Object.entries(l.attributes).map(([k, v]) => `${k}: ${v}`),
            ].join("\n"),
            String(l.quantity),
            l.unit,
            money(l.unitPrice),
            money(roundMoney(l.quantity * l.unitPrice)),
          ],
    ),
    styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [113, 75, 103] },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 64 },
      2: { cellWidth: 15, halign: "right" },
      3: { cellWidth: 20 },
      4: { cellWidth: 32, halign: "right" },
      5: { cellWidth: 33, halign: "right" },
    },
    rowPageBreak: "avoid",
  });
  if (record.notes)
    autoTable(doc, {
      startY: lastY() + 5,
      margin: margins,
      theme: "plain",
      body: [
        [{ content: "Notes & terms", styles: { fontStyle: "bold" } }],
        [record.notes],
      ],
      styles: { fontSize: 9, cellPadding: 2.5, overflow: "linebreak" },
    });
  const amounts = [
    ["Untaxed amount", money(calculated.subtotal)],
    ["Discount", money(discount)],
  ];
  if (invoice?.deduction)
    amounts.push([
      "Down payments (excl. tax)",
      `-${money(invoice.deduction - invoice.deductionTax)}`,
    ]);
  amounts.push([
    `Tax (${record.taxRate}%)`,
    money(calculated.tax - (invoice?.deductionTax || 0)),
  ]);
  amounts.push([
    "Total",
    money(invoice ? invoiceTotal(invoice) : calculated.total),
  ]);
  autoTable(doc, {
    startY: lastY() + 6,
    margin: { ...margins, left: 104 },
    theme: "plain",
    pageBreak: "avoid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: "right" } },
    body: amounts,
    didParseCell: (cell) => {
      if (cell.row.index === amounts.length - 1) {
        cell.cell.styles.fontStyle = "bold";
        cell.cell.styles.fillColor = [241, 236, 240];
      }
    },
  });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFillColor(113, 75, 103);
    doc.rect(0, 0, 210, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(113, 75, 103);
    doc.setFontSize(22);
    doc.text("GOELTA", 16, 20);
    doc.setFontSize(10);
    doc.text(heading, 194, 19, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 120);
    doc.setFontSize(9);
    doc.text(
      sale?.isDemo ? "Demo document - sample data" : "Sales & operations",
      16,
      29,
    );
    doc.setDrawColor(225, 222, 228);
    doc.line(16, 34, 194, 34);
    doc.line(16, 280, 194, 280);
    doc.setFontSize(8);
    doc.text("GOELTA | " + record.number, 16, 286);
    doc.text(`Page ${page} of ${doc.getNumberOfPages()}`, 194, 286, {
      align: "right",
    });
  }
  return doc;
}
export const pdfFilename = (number: string) =>
  `GOELTA-${number.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100)}.pdf`;
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
