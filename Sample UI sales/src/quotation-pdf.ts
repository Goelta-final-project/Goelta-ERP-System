import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { Quote } from './App';
import { calculateTotals, roundMoney } from './sales-logic';

export const quotationFilename = (id: string) => `GOELTA-${id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'quotation'}.pdf`;
const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function createQuotationPdf(q: Quote) {
  const calculated = q.lines ? calculateTotals(q.lines, q.discount, q.taxRate) : undefined;
  if (calculated && Math.abs(calculated.total - q.total) >= 0.005) throw Error('Saved total does not match the quotation lines. Correct the quotation before exporting.');
  const amounts = [q.total, q.discount ?? 0, q.taxRate ?? 0, ...(q.lines ?? []).flatMap(l => [l.quantity, l.unitPrice, l.quantity * l.unitPrice])];
  if (amounts.some(n => !Number.isFinite(n) || n < 0)) throw new Error('Quotation contains invalid amounts. Correct them before exporting.');
  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
  doc.setProperties({ title: `GOELTA Sales Quotation ${q.id}`, author: 'GOELTA', subject: `Quotation for ${q.customer}` });
  const margin = 16;
  autoTable(doc, {
    startY: 43, margin: { top: 43, bottom: 22, left: margin, right: margin }, theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', textColor: [90, 105, 120] } },
    body: [
      ['Quotation title', q.title || 'Not recorded'], ['Description', q.description || 'Not recorded'],
      ['Quotation number', q.id], ['Date / valid until', `${q.date} / ${q.expiry}`],
      ['Customer company', q.customer], ['Address', q.customerAddress || 'Not recorded'],
      ['Company email', q.customerEmail || 'Not recorded'], ['Company phone', q.customerPhone || 'Not recorded'],
    ],
  });
  const lastY = () => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: lastY() + 8, margin: { top: 43, bottom: 22, left: margin, right: margin },
    head: [['Item', 'Description', 'Unit', 'Qty', 'Unit price', 'Amount']],
    body: q.lines?.length ? q.lines.map((line, i) => [line.itemNo || String(i + 1), [line.description, ...Object.entries(line.attributes || {}).map(([key, value]) => `${key}: ${value}`)].join('\n'), line.unit || '-', String(line.quantity), money(line.unitPrice), money(roundMoney(line.quantity * line.unitPrice))]) : [[{ content: 'No item breakdown recorded.', colSpan: 6 }]],
    theme: 'striped', styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [18, 100, 163], textColor: 255 },
    columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 67 }, 2: { cellWidth: 17 }, 3: { cellWidth: 17, halign: 'right' }, 4: { cellWidth: 31, halign: 'right' }, 5: { cellWidth: 31, halign: 'right' } },
    rowPageBreak: 'avoid',
  });
  const subtotal = calculated?.subtotal;
  const totals: string[][] = [];
  if (subtotal !== undefined) totals.push(['Subtotal', money(subtotal)]);
  if (q.discount !== undefined) totals.push(['Discount', money(q.discount)]);
  if (calculated) totals.push([`Tax (${q.taxRate ?? 0}%)`, money(calculated.tax)]);
  totals.push(['Total', money(q.total)]);
  autoTable(doc, { startY: lastY() + 7, margin: { top: 43, bottom: 22, left: 108, right: margin }, body: totals, theme: 'plain', pageBreak: 'avoid', styles: { fontSize: 11, cellPadding: 3 }, columnStyles: { 1: { halign: 'right' } }, didParseCell: data => { if (data.row.index === totals.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [232, 242, 249]; } } });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFillColor(18, 100, 163); doc.rect(0, 0, 210, 5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(18, 100, 163); doc.text('GOELTA', margin, 20);
    doc.setFontSize(12); doc.setTextColor(30, 45, 60); doc.text('SALES QUOTATION', 194, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(105, 115, 125); doc.text(q.isDemo ? 'Demo quotation - sample data' : 'Customer quotation', margin, 29);
    doc.setDrawColor(225, 232, 239); doc.line(margin, 34, 194, 34); doc.line(margin, 280, 194, 280);
    doc.setFontSize(8); doc.text('GOELTA | Sales quotation', margin, 286); doc.text(`Page ${page} of ${pages}`, 194, 286, { align: 'right' });
  }
  return doc;
}

export function downloadPdf(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = file.name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
