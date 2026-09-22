# GOELTA Sales Workspace

A new React + TypeScript app implementing the root `todo.md`. The previous app remains separately in `Sample UI sales/`.

## Run

Node.js 18 or newer:

```sh
cd sales-app
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Build with `npm run build`; inspect the build with `npm run preview`. Production hosting must serve `index.html` for client-side routes.

## Features

- **Quotations:** searchable/sortable lists; customer, title, description, dates, discount and tax; inline catalog/custom products and services; sections, notes, ordering, removal, BOQ item numbers and custom attributes. Draft editing, hold, rejection, cancellation, duplication, history and internal notes.
- **Orders:** confirming a quotation changes the same record into a sales order. Smart buttons link invoices and purchases. An Orders to Invoice list shows invoicing progress.
- **Invoices:** confirmed orders create draft regular invoices or percentage/fixed down payments. Review dates/notes, post, and record partial/full payments. Final invoices deduct posted down payments and their tax. Duplicate invoices, excessive deposits, overpayments and unsafe cancellations are rejected.
- **Purchases:** create an independent vendor RFQ or create one from a confirmed sale. Linked RFQs copy product quantities, exclude catalog services, and leave vendor costs for explicit entry. Confirm the order and validate a full receipt to increase stock exactly once. One active linked purchase per sale prevents duplicate procurement.
- **Customers:** company details, activation/deactivation, optional-name contacts, To/CC recipient profiles and a default profile. Subcontracts are absent from the new model and UI.
- **Products and Excel:** manage products or import directly without preview. Download a schema with configurable extra columns. Catalog imports update matching product codes and add new products. Quotation imports add a `Quantity` column and insert rows directly into the editor without changing catalog stock/prices. Invalid imports do not change stored records.
- **PDF/email:** paginated quotation, invoice and purchase PDFs. Quotation title/description are included and status is omitted. Invoice notes appear below products. Email supports recipient profiles, custom To/CC, PDF downloads, and native sharing when supported. Users explicitly mark sent after sending from their email app.

## Persistence and scope

This is a self-contained frontend with browser-local persistence, not an Odoo server integration. It has no backend, authentication, banking integration or automatic email delivery. Records are saved together under `goelta.sales-workspace.v1`, with validation, storage-error handling and conflicting-tab protection. Initial quotation records are marked as demo data.

On the **same origin** as the previous app, and before the new workspace has been saved, the app reads existing `goelta.customer-companies.v1`, `goelta.catalog.v1`, `goelta.quotations.v1`, and Excel-schema keys. Legacy data is never modified; subcontract fields are omitted from the imported records. Invalid legacy data blocks writes. Browser storage is isolated by host and port; running on another port cannot access the earlier app's data.

The supported workflow invoices **ordered quantities** and receives whole purchase orders. Stock shortages are quotation warnings so orders can proceed to purchasing. Advanced Odoo features—delivered-quantity invoicing, automated procurement, multiple vendor allocations, partial receipts, credit notes, vendor bills and bank reconciliation—are outside this frontend's scope. Currency is USD, matching the earlier app; tax rates are user-entered.

References: [Odoo invoicing](https://www.odoo.com/documentation/18.0/applications/sales/sales/invoicing/invoicing_policy.html), [down payments](https://www.odoo.com/documentation/18.0/applications/sales/sales/invoicing/down_payment.html), [RFQs](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html).

## Verification and structure

```sh
npm test
npm run build
```

Tests cover business transitions, rounding, deposits/tax, partial payments, duplicate protection, receipts, recipient profiles, Excel, PDF contents/pagination, migration, storage conflicts/corruption, and component-level flows through the React screens.

- `src/domain.ts`: workflow rules and monetary calculations.
- `src/model.ts`: record types.
- `src/storage.ts`: validation, seeds and legacy migration.
- `src/store.tsx`: atomic browser-storage commits.
- Screen modules: sales, customers, invoices, purchases and products.
- Excel and PDF libraries load on demand.
