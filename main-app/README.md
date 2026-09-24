# GOELTA Business Workspace

A React + TypeScript app with a main dashboard and an integrated sales workspace. The dashboard follows the supplied HTML's launcher, financial overview, and task-manager layout using the sales app's plum, teal, and light-surface visual language. The former `sales-app` has been moved into this app as `src/modules/sales`; it is no longer a separate React root or build.

## Run

Node.js 18 or newer:

```sh
cd main-app
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Build with `npm run build`; inspect the build with `npm run preview`. Production hosting must serve `index.html` for client-side routes.

## Features

- **Dashboard (`/`):** seven application tiles; Sales opens quotations, Accounting opens customer invoices, Inventory opens the product catalog, and Stakeholders opens customers. Projects, HR, and Settings are visibly unavailable until those modules are implemented. No inactive tile claims to be a working module.
- **Workspace search:** find available applications, customers, quotations/orders, invoices, and purchases; follow results directly to records.
- **Financial activity:** select a year to compare posted invoice totals with confirmed/received purchase totals. Values include tax, use the sales workspace's USD currency, and exclude drafts/cancellations. These are document totals, not recognized revenue or accounting cost of revenue. An accessible monthly table accompanies the chart; there are no invented chart values.
- **Personal tasks:** add, complete, and delete tasks. Tasks use a separate validated browser-storage key, with visible errors for corrupt data, failed writes, and conflicts with another tab.
- **Quotations:** searchable/sortable lists; customer, title, description, dates, discount and tax; inline catalog/custom products and services; sections, notes, ordering, removal, BOQ item numbers and custom attributes. Draft editing, hold, rejection, cancellation, duplication, history and internal notes.
- **Orders:** confirming a quotation changes the same record into a sales order. Smart buttons link invoices and purchases. An Orders to Invoice list shows invoicing progress.
- **Invoices:** confirmed orders create draft regular invoices or percentage/fixed down payments. Review dates/notes, post, and record partial/full payments. Final invoices deduct posted down payments and their tax. Duplicate invoices, excessive deposits, overpayments and unsafe cancellations are rejected.
- **Purchases:** create an independent vendor RFQ or create one from a confirmed sale. Linked RFQs copy product quantities, exclude catalog services, and leave vendor costs for explicit entry. Confirm the order and validate a full receipt to increase stock exactly once. One active linked purchase per sale prevents duplicate procurement.
- **Customers:** company details, activation/deactivation, optional-name contacts, To/CC recipient profiles and a default profile. Subcontracts are absent from the new model and UI.
- **Products and Excel:** manage products or import directly without preview. Download a schema with configurable extra columns. Catalog imports update matching product codes and add new products. Quotation imports add a `Quantity` column and insert rows directly into the editor without changing catalog stock/prices. Invalid imports do not change stored records.
- **PDF/email:** paginated quotation, invoice and purchase PDFs. Quotation title/description are included and status is omitted. Invoice notes appear below products. Email supports recipient profiles, custom To/CC, PDF downloads, and native sharing when supported. Users explicitly mark sent after sending from their email app.

## Persistence and scope

This is a self-contained frontend with browser-local persistence, not an Odoo server integration. The repository's Java server is not connected to this frontend. It has no authentication, shared server persistence, banking integration or automatic email delivery. Records are saved together under the unchanged `goelta.sales-workspace.v1` key, with validation, storage-error handling and conflicting-tab protection. Personal tasks use `goelta.dashboard-tasks.v1`. Initial quotation records remain marked as demo data and dashboard summaries explicitly identify their presence. A production build is supported; deploying a shared business system still requires authenticated backend persistence and replacing the initial sample data with an intentional onboarding flow.

On the **same origin** as the previous app, and before the new workspace has been saved, the app reads existing `goelta.customer-companies.v1`, `goelta.catalog.v1`, `goelta.quotations.v1`, and Excel-schema keys. Legacy data is never modified; subcontract fields are omitted from the imported records. Invalid legacy data blocks writes. Browser storage is isolated by host and port; running on another port cannot access the earlier app's data.

The supported workflow invoices **ordered quantities** and receives whole purchase orders. Stock shortages are quotation warnings so orders can proceed to purchasing. Advanced Odoo features—delivered-quantity invoicing, automated procurement, multiple vendor allocations, partial receipts, credit notes, vendor bills and bank reconciliation—are outside this frontend's scope. Currency is USD, matching the earlier app; tax rates are user-entered.

References: [Odoo invoicing](https://www.odoo.com/documentation/18.0/applications/sales/sales/invoicing/invoicing_policy.html), [down payments](https://www.odoo.com/documentation/18.0/applications/sales/sales/invoicing/down_payment.html), [RFQs](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html).

## Verification and structure

```sh
npm test
npm run build
```

Tests cover business transitions, rounding, deposits/tax, partial payments, duplicate protection, receipts, recipient profiles, Excel, PDF contents/pagination, migration, storage conflicts/corruption, and component-level flows through the React screens. Dashboard tests cover sales navigation and return, legacy links, record search, task persistence/failure/conflict handling, and financial aggregation.

```text
src/
  app/                         Root routes, legacy redirects, error boundary
  modules/
    dashboard/
      components/              Header/search, application launcher, chart, tasks
      data/                    Module definitions, analytics, task validation
      Dashboard.tsx            Dashboard composition
      dashboard.css            Responsive dashboard styles
    sales/
      features/
        quotations/            List, route, form, detail, invoice dialog
        customers/             List, route, form, recipient editor
        invoices/              List, route, detail, payment dialog
        purchases/             List, route, form, detail
        products/              Catalog and product/schema dialogs
      components/              Navigation, line editor, totals, activity, sharing
      domain/                  Types and pure rules grouped by business area
      data/                    Provider, validation, seeds, migration, storage key
      services/                Excel, import schema/parser, PDF generation
      styles/                  Shell, controls, lists, records, dialogs, responsive rules
      SalesWorkspace.tsx       Sales layout and nested routes
  shared/
    ui/                        One reusable UI component per file
    hooks/                     Validated, conflict-aware persistence
  styles/                      Global typography/tokens and ordered CSS imports
```

Keep business mutations in `modules/sales/domain` and commit them through `WorkspaceProvider.transact`. UI components should not write sales storage directly. `domain/workflow.ts` and `data/storage.ts` are public export surfaces; the implementation lives in the focused files beside them. Excel and PDF libraries continue to load on demand.

## Routes and deployment

- `/` is the main dashboard; `/sales` redirects to `/sales/quotations`.
- Sales routes live under `/sales/*`; the GOELTA app-grid link returns to the dashboard.
- Old `/quotations/*`, `/orders`, `/to-invoice`, `/customers/*`, `/invoices/*`, `/purchases/*`, and `/products` URLs redirect with their query strings and fragments intact.
- Build with `npm run build` and serve `dist/` over HTTPS. Configure the host to fall back to `index.html` for client-side paths, including `/sales/*` and legacy links. `npm run preview` is for locally inspecting a build, not a production server.
- Keep the same origin (scheme, host, and port) to retain existing browser records. Moving source folders does not change the storage keys; moving to another origin requires a separate data migration.
- No CDN JavaScript from the reference HTML is used. Charts and icons are local SVG components. The existing DM Sans Google Fonts stylesheet is retained with system-font fallbacks.
