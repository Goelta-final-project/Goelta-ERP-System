import type { Quote } from './App';

export const validEmail = (value: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function calculateTotals(lines: { quantity: number; unitPrice: number }[], discount = 0, taxRate = 0) {
  if (lines.some(l => !Number.isFinite(l.quantity) || l.quantity <= 0 || !Number.isFinite(l.unitPrice) || l.unitPrice < 0)) throw Error('Each line needs a positive quantity and a non-negative rate.');
  const subtotal = roundMoney(lines.reduce((sum, l) => sum + roundMoney(l.quantity * l.unitPrice), 0));
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) throw Error('Discount must be between zero and the subtotal.');
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw Error('Tax must be between 0 and 100 percent.');
  const tax = roundMoney((subtotal - roundMoney(discount)) * taxRate / 100);
  const total = roundMoney(subtotal - roundMoney(discount) + tax);
  if (![subtotal, tax, total].every(v => Number.isFinite(v) && Math.abs(v * 100) <= Number.MAX_SAFE_INTEGER)) throw Error('Quotation amounts are too large.');
  return { subtotal, tax, total };
}
export function stockError(lines: { catalogId?: string; quantity: number }[], catalog: { id: string; available: number | null }[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) if (line.catalogId) quantities.set(line.catalogId, (quantities.get(line.catalogId) || 0) + line.quantity);
  for (const [id, quantity] of quantities) {
    const item = catalog.find(c => c.id === id);
    if (!item) return `Catalog item ${id} is no longer available. Remove it and select an available item.`;
    if (item.available !== null && quantity > item.available) return `${id}: combined quantity ${quantity} exceeds available stock ${item.available}.`;
  }
  return '';
}
export function localDate(offsetDays = 0) {
  const date = new Date(); date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function canTransition(from: Quote['status'], to: Quote['status']) {
  const allowed: Record<Quote['status'], Quote['status'][]> = { Draft: ['Sent', 'Hold'], Sent: ['Accepted', 'Rejected', 'Hold'], Hold: ['Draft', 'Sent'], Accepted: [], Rejected: [] };
  return allowed[from]?.includes(to) ?? false;
}
export function insertQuotation(current: Quote[], quote: Quote) {
  if (current.some(q => q.id.toLowerCase() === quote.id.toLowerCase())) throw Error('That quotation number already exists. Choose a unique number.');
  return [quote, ...current];
}
export function updateDraft(current: Quote[], id: string, quote: Quote) {
  const existing = current.find(q => q.id === id);
  if (!existing) throw Error('This draft no longer exists.');
  if (existing.status !== 'Draft' || quote.status !== 'Draft') throw Error('Only draft quotations can be edited.');
  if (current.some(q => q.id !== id && q.id.toLowerCase() === quote.id.toLowerCase())) throw Error('That quotation number already exists. Choose a unique number.');
  return current.map(q => q.id === id ? { ...quote, statusHistory: existing.statusHistory, statusDate: existing.statusDate } : q);
}
export function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function validAttributes(value: unknown) { return value === undefined || (isRecord(value) && Object.values(value).every(v => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)))); }
export function validQuotes(value: unknown): value is Quote[] {
  if (!Array.isArray(value) || new Set(value.map(q => q?.id?.toLowerCase?.())).size !== value.length) return false;
  return value.every(q => {
    if (!isRecord(q) || !['id', 'customer', 'date', 'expiry'].every(k => typeof q[k] === 'string') || !['Draft', 'Sent', 'Hold', 'Accepted', 'Rejected'].includes(String(q.status))) return false;
    if (!(q.id as string).trim() || !validDate(q.date as string) || !validDate(q.expiry as string) || (q.expiry as string) < (q.date as string)) return false;
    if (!['customerId', 'customerEmail', 'customerPhone', 'customerAddress', 'statusDate'].every(k => q[k] === undefined || typeof q[k] === 'string')) return false;
    if (q.subcontractId !== undefined && (typeof q.subcontractId !== 'string' || !q.subcontractId.trim()) || q.subcontract !== undefined && (typeof q.subcontract !== 'string' || !q.subcontract.trim())) return false;
    if (q.isDemo !== undefined && typeof q.isDemo !== 'boolean') return false;
    if (q.statusHistory !== undefined && (!Array.isArray(q.statusHistory) || !q.statusHistory.every(entry => isRecord(entry) && ['Draft', 'Sent', 'Hold', 'Accepted', 'Rejected'].includes(String(entry.status)) && typeof entry.date === 'string' && Number.isFinite(Date.parse(entry.date))))) return false;
    if (typeof q.total !== 'number' || !Number.isFinite(q.total) || q.total < 0) return false;
    if (q.recipients !== undefined && (!Array.isArray(q.recipients) || !q.recipients.every(r => isRecord(r) && ['To', 'CC'].includes(String(r.role)) && typeof r.email === 'string' && validEmail(r.email) && (r.name === undefined || typeof r.name === 'string')))) return false;
    if (q.lines !== undefined && (!Array.isArray(q.lines) || !q.lines.every(l => isRecord(l) && typeof l.description === 'string' && typeof l.quantity === 'number' && typeof l.unitPrice === 'number' && validAttributes(l.attributes)))) return false;
    if (Array.isArray(q.lines) && !q.lines.every(l => ['itemNo', 'unit', 'catalogId'].every(k => l[k] === undefined || typeof l[k] === 'string'))) return false;
    try { if (Array.isArray(q.lines)) return Math.abs(calculateTotals(q.lines as NonNullable<Quote['lines']>, q.discount as number | undefined, q.taxRate as number | undefined).total - q.total) < 0.005; } catch { return false; }
    return true;
  });
}
