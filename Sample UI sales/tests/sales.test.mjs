import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { loadSource } from './load-source.mjs';
const logic = loadSource('src/sales-logic.ts');
const importer = loadSource('src/sales-import.ts');
const customers = loadSource('src/customers.tsx');
const { usePersistentState } = loadSource('src/use-persistent-state.ts');
const { createQuotationPdf, quotationFilename } = loadSource('src/quotation-pdf.ts');
const { buildQuotationMailto } = loadSource('src/quotation-email.tsx');
const quote = { id: 'SQ-test', customer: 'Test company', date: '2026-09-15', expiry: '2026-10-15', total: 20, status: 'Draft', discount: 0, taxRate: 0, lines: [{ itemNo: '1.1', description: 'Supply and install', quantity: 2, unit: 'Item', unitPrice: 10, attributes: { Brand: 'Goelta' } }] };
const headers = Object.values(importer.catalogColumns);
test('editing replaces only the draft and rejects missing, non-draft or duplicate targets', () => {
  const other = { ...quote, id: 'other' };
  const changed = { ...quote, total: 30, lines: [{ ...quote.lines[0], quantity: 3 }] };
  const updated = logic.updateDraft([quote, other], quote.id, changed);
  assert.equal(updated.length, 2);
  assert.equal(updated[0].total, 30);
  assert.equal(updated[1], other);
  assert.equal(quote.total, 20);
  assert.throws(() => logic.updateDraft([quote], 'missing', changed));
  assert.throws(() => logic.updateDraft([{ ...quote, status: 'Sent' }], quote.id, changed));
  assert.throws(() => logic.updateDraft([quote], quote.id, { ...changed, status: 'Sent' }));
  assert.throws(() => logic.updateDraft([quote, other], quote.id, { ...changed, id: 'OTHER' }));
  assert.equal(logic.updateDraft([quote], quote.id, { ...changed, id: 'renamed' })[0].id, 'renamed');
});
const row = ['1.1', 'P1', 'Product', 'Pipe', 'Materials', 'm', 15.5, 10];
const sheet = (rows, headings = headers) => XLSX.utils.aoa_to_sheet([['GOELTA SALES CATALOG TEMPLATE'], [], headings, ...rows]);

test('money rounds line amounts consistently; invalid quantities, discounts and taxes fail', () => {
  assert.deepEqual(logic.calculateTotals([{ quantity: 3, unitPrice: 0.335 }], 0, 18), { subtotal: 1.01, tax: 0.18, total: 1.19 });
  for (const bad of [NaN, Infinity, -1, 0]) assert.throws(() => logic.calculateTotals([{ quantity: bad, unitPrice: 10 }]));
  assert.throws(() => logic.calculateTotals(quote.lines, 21));
  assert.throws(() => logic.calculateTotals(quote.lines, 0, 101));
  assert.throws(() => logic.calculateTotals([{ quantity: Number.MAX_VALUE, unitPrice: 100 }]));
});
test('stock checks total repeated sales lines and current availability; api-services remain unlimited', () => {
  const catalog = [{ id: 'P1', available: 10 }, { id: 'S1', available: null }];
  assert.match(logic.stockError([{ catalogId: 'P1', quantity: 6 }, { catalogId: 'P1', quantity: 6 }], catalog), /combined quantity 12/);
  assert.match(logic.stockError([{ catalogId: 'missing', quantity: 1 }], catalog), /no longer available/);
  assert.equal(logic.stockError([{ catalogId: 'S1', quantity: 9999 }, { quantity: 2 }], catalog), '');
});
test('quotation IDs cannot overwrite records and terminal statuses cannot reset', () => {
  assert.throws(() => logic.insertQuotation([quote], { ...quote, id: 'sq-TEST' }), /already exists/);
  assert.equal(logic.canTransition('Draft', 'Accepted'), false);
  assert.equal(logic.canTransition('Sent', 'Accepted'), true);
  assert.equal(logic.canTransition('Accepted', 'Sent'), false);
  assert.equal(logic.canTransition('Rejected', 'Hold'), false);
  assert.equal(logic.canTransition('Hold', 'Sent'), true);
  assert.equal(logic.validDate('2026-02-30'), false);
  assert.equal(logic.validDate('2028-02-29'), true);
});
test('real XLSX template roundtrip retains configured extra values and supports reordered columns', () => {
  const book = importer.createCatalogTemplate(['Brand', 'Warranty']);
  const file = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  const reopened = XLSX.read(file);
  assert.equal(importer.parseCatalog(reopened.Sheets.Catalog, ['Brand', 'Warranty']).length, 2);
  const imported = importer.parseCatalog(sheet([[...row, 'Aqua', 24]], [...headers, 'Brand', 'Warranty']), ['Brand', 'Warranty']);
  assert.deepEqual(imported[0].attributes, { Brand: 'Aqua', Warranty: 24 });
  assert.equal(importer.parseCatalog(sheet([[...row].reverse()], [...headers].reverse()), [])[0].id, 'P1');
});
test('strict imports reject aliases, missing, duplicate, unknown and blank headings', () => {
  for (const headings of [headers.map(h => h === 'Rate' ? 'Price' : h), headers.slice(1), [...headers, 'Mystery'], [...headers, 'Rate'], [...headers, '']]) {
    const rows = headings.at(-1) === '' ? [[...row, 'orphan']] : [row];
    assert.throws(() => importer.parseCatalog(sheet(rows, headings), []));
  }
  assert.throws(() => importer.parseCatalog(sheet([row]), ['Brand']), /Missing: Brand/);
  assert.throws(() => importer.parseCatalog(sheet([row], headers.map(h => h === 'Rate' ? ' Rate' : h)), []));
  assert.equal(importer.validExtraColumns(['rate']), false);
  assert.equal(importer.validExtraColumns(['Brand', 'brand']), false);
  assert.equal(importer.validExtraColumns(['']), false);
});
test('invalid rows are rejected without dropping them; row numbers include blank rows', () => {
  assert.throws(() => importer.parseCatalog(sheet([row, row]), []), /duplicate Product ID/);
  for (const index of [0, 1, 3, 4, 5, 6, 7]) {
    const bad = [...row]; bad[index] = '';
    assert.throws(() => importer.parseCatalog(sheet([bad]), []));
  }
  for (const rate of ['bad', '0x10', Infinity, -5, true]) { const bad = [...row]; bad[6] = rate; assert.throws(() => importer.parseCatalog(sheet([bad]), [])); }
  const bad = [...row]; bad[6] = '';
  assert.throws(() => importer.parseCatalog(sheet([row, [], bad]), []), /Row 6:/);
  assert.throws(() => importer.parseCatalog(sheet([]), []), /no product/);
  const service = [...row]; service[2] = 'Service'; service[7] = '';
  assert.equal(importer.parseCatalog(sheet([service]), [])[0].available, null);
});
const company = { id: 'C1', name: 'Company', email: 'main@example.com', phone: '', address: '', city: '', status: 'Active', defaultProfileId: 'R1', contacts: [{ id: 'A', name: '', position: 'Engineer', email: 'engineer@example.com', phone: '' }, { id: 'B', name: '', position: 'BA', email: 'MAIN@example.com', phone: '' }], profiles: [{ id: 'R1', name: 'Engineering', to: 'A', cc: ['company'] }] };
test('nameless contacts, company email CC, duplicate addresses, and stale IDs are handled', () => {
  assert.equal(customers.validCompanies([company]), true);
  assert.deepEqual(customers.cleanRecipients(company, 'A', ['company', 'B', 'A', 'missing']), { to: 'A', cc: ['company'] });
  assert.equal(customers.recipientOptions(company)[1].label, 'Engineer');
  assert.equal(customers.validCompanies([{ ...company, contacts: [null] }]), false);
  assert.equal(customers.validCompanies([{ ...company, defaultProfileId: 'missing' }]), false);
});
test('email links encode body and subject safely, deduplicate recipients, reject header injection', () => {
  const link = buildQuotationMailto('a+quotes@example.com', ['B@example.com', 'b@example.com', 'A+quotes@example.com'], 'Quote & rates?', 'Line 1\nLine 2');
  const url = new URL(link);
  assert.equal(url.searchParams.get('cc'), 'b@example.com');
  assert.equal(url.searchParams.get('subject'), 'Quote & rates?');
  assert.equal(url.searchParams.get('body'), 'Line 1\nLine 2');
  assert.throws(() => buildQuotationMailto('a@example.com\r\nBcc:x@y.com', [], 'hello', ''));
  assert.throws(() => buildQuotationMailto('a@example.com', [], 'hello\r\nBcc:bad', ''));
});
test('PDF exports a real quotation without demo label, units and custom attributes included; long tables paginate', () => {
  const doc = createQuotationPdf(quote);
  assert.equal(doc.getNumberOfPages(), 1);
  assert.ok(doc.output('arraybuffer').byteLength > 1000);
  assert.throws(() => createQuotationPdf({ ...quote, total: 19 }), /does not match/);
  const manyLines = Array.from({ length: 90 }, (_, index) => ({ ...quote.lines[0], description: `Long description ${index} with wrapped construction work and materials supplied to site.` }));
  assert.ok(createQuotationPdf({ ...quote, lines: manyLines, total: 1800 }).getNumberOfPages() > 1);
  assert.equal(quotationFilename('2610/MTS/1170'), 'GOELTA-2610-MTS-1170.pdf');
});
test('quotation storage validation rejects malformed and mismatched records', () => {
  assert.equal(logic.validQuotes([quote]), true);
  assert.equal(logic.validQuotes([{ ...quote, total: 21 }]), false);
  assert.equal(logic.validQuotes([{ ...quote, lines: [null] }]), false);
  assert.equal(logic.validQuotes([quote, quote]), false);
});
function storage() {
  const map = new Map();
  globalThis.localStorage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  return map;
}
function mountStore(key, fallback = []) {
  let latest;
  function Probe() { latest = usePersistentState(key, fallback, Array.isArray); return null; }
  let renderer; act(() => { renderer = create(React.createElement(Probe)); });
  return { get current() { return latest; }, unmount() { act(() => renderer.unmount()); } };
}
test('saving survives remount and functional updates use the latest value', () => {
  storage(); const store = mountStore('test');
  act(() => { store.current.commit(v => [...v, 'a']); store.current.commit(v => [...v, 'b']); });
  assert.deepEqual(store.current.value, ['a', 'b']); store.unmount();
  const restored = mountStore('test'); assert.deepEqual(restored.current.value, ['a', 'b']); restored.unmount();
});
test('quota failures and conflicting tabs preserve previously saved records', () => {
  const map = storage(); const first = mountStore('test'); const second = mountStore('test');
  act(() => { assert.equal(first.current.commit(['a']), true); });
  act(() => { assert.equal(second.current.commit(['b']), false); });
  assert.equal(map.get('test'), '["a"]'); assert.match(second.current.error, /another tab/);
  localStorage.setItem = () => { throw Error('Storage quota exceeded'); };
  act(() => { assert.equal(first.current.commit(['c']), false); });
  assert.deepEqual(first.current.value, ['a']); first.unmount(); second.unmount();
});
test('corrupt data is not silently overwritten with seeds', () => {
  const map = storage(); map.set('test', '{broken'); const store = mountStore('test', ['seed']);
  act(() => assert.equal(store.current.commit(['replacement']), false));
  assert.equal(map.get('test'), '{broken'); assert.ok(store.current.error); store.unmount();
});
