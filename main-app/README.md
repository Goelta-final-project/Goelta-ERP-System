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

- **Dashboard (`/`):** six application tiles. Sales is the only enabled workspace; Accounting, Projects, Inventory, HR, and Stakeholders remain visible but unavailable until their modules are implemented. Settings lives in the header account area rather than the launcher.
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

## UI code tree

Use this map when changing the interface by hand. Route-level files compose
screens; reusable controls live under `shared/ui`; colors and dark-mode
overrides live in `styles/theme.css`.

```text
src/
├── main.tsx                         # Browser entry; mounts React and global CSS
├── assets/
│   └── goelta-logo.png             # Source copy of the company logo
├── app/
│   ├── App.tsx                     # Top-level routes and legacy URL redirects
│   ├── ErrorBoundary.tsx           # Safe fallback for rendering failures
│   └── RouteEffects.tsx            # Scroll, focus, and document-title changes
├── modules/
│   ├── dashboard/
│   │   ├── Dashboard.tsx           # Main-page composition and sales metrics
│   │   ├── dashboard.css           # Dashboard layout and responsive rules
│   │   ├── components/
│   │   │   ├── WorkspaceHeader.tsx # Logo, search, theme/settings, account area
│   │   │   ├── ApplicationLauncher.tsx # Enabled/disabled module tiles
│   │   │   ├── FinancialActivity.tsx   # Monthly invoice/purchase chart
│   │   │   └── TaskManager.tsx         # Browser-local personal tasks
│   │   └── data/
│   │       ├── applications.ts     # Tile labels, icons, tones, enabled hrefs
│   │       ├── analytics.ts        # Dashboard financial aggregation
│   │       └── tasks.ts            # Task validation and storage model
│   └── sales/
│       ├── SalesWorkspace.tsx      # Sales shell, nested routes, toast, footer
│       ├── components/
│       │   ├── SalesNavigation.tsx # Primary/secondary sales navigation
│       │   ├── LineEditor.tsx      # Editable/read-only document line table
│       │   ├── Totals.tsx          # Discount, tax, and grand total UI
│       │   ├── Activity.tsx        # Notes and record history timeline
│       │   └── sharing/
│       │       ├── EmailDialog.tsx # Recipient selection and email hand-off
│       │       ├── PdfButton.tsx   # Lazy PDF generation/download action
│       │       └── buildMailto.ts  # Native mail-client URL construction
│       ├── features/
│       │   ├── quotations/
│       │   │   ├── SalesList.tsx   # Quotations/orders/to-invoice lists
│       │   │   ├── SaleRoute.tsx   # New/detail/edit route selection
│       │   │   ├── SaleForm.tsx    # Compact quotation creation/edit form
│       │   │   ├── SaleDetail.tsx  # Quotation and sales-order record view
│       │   │   └── CreateInvoice.tsx # Invoice/down-payment dialog
│       │   ├── customers/          # Customer list/form/route/recipients
│       │   ├── invoices/           # Invoice list/detail/route/payment dialog
│       │   ├── purchases/          # RFQ/purchase list/form/detail/route
│       │   └── products/           # Catalog and product/schema dialogs
│       ├── data/
│       │   ├── WorkspaceProvider.tsx # Shared state and transaction boundary
│       │   ├── storage.ts          # Stable public exports for persistence
│       │   ├── migration.ts        # Legacy-browser-data import
│       │   ├── validation.ts       # Runtime workspace validation
│       │   ├── seeds.ts            # Initial/demo workspace data
│       │   └── keys.ts             # Browser-storage keys
│       ├── domain/
│       │   ├── types.ts            # Business data types
│       │   ├── workflow.ts         # Stable public domain export surface
│       │   ├── common.ts           # Money, lines, IDs, dates, validation
│       │   ├── quotations.ts       # Sale creation/save/transitions
│       │   ├── invoicing.ts        # Invoice/payment rules
│       │   ├── purchasing.ts       # RFQ/order/receipt rules
│       │   ├── customers.ts        # Customer and recipient rules
│       │   └── catalog.ts          # Product/catalog rules
│       ├── services/
│       │   ├── excel.ts            # Lazy Excel facade
│       │   ├── catalog-import.ts   # Workbook-to-catalog parser
│       │   ├── catalog-schema.ts   # Configurable import columns
│       │   └── pdf.ts              # Quotation/invoice/purchase PDF output
│       └── styles/
│           ├── shell.css           # Top bar, secondary nav, page container
│           ├── controls.css        # Headers, buttons, links
│           ├── lists.css           # Metrics, filters, tables, empty states
│           ├── records.css         # Record sheets, fields, tabs
│           ├── line-editor.css     # Order-line table/editor
│           ├── document-summary.css # Notes and totals
│           ├── activity.css        # Timeline and internal notes
│           ├── recipients-payments.css # Recipient/payment rows
│           ├── customers-products.css  # Customer/product-specific views
│           ├── dialogs.css         # Modals, alerts, toast, footer
│           └── responsive.css      # Cross-feature breakpoints
├── shared/
│   ├── hooks/
│   │   └── usePersistentState.ts   # Validated writes and tab-conflict checks
│   └── ui/
│       ├── Button.tsx / Field.tsx / Search.tsx
│       ├── PageHeader.tsx / Pagination.tsx / Tabs.tsx
│       ├── Modal.tsx / Empty.tsx / Badge.tsx
│       ├── Icon.tsx                # Local SVG icon paths
│       ├── ThemeToggle.tsx         # Persistent light/dark selection
│       ├── StatusBar.tsx           # Compact workflow-action row
│       └── index.ts                # Shared UI exports
└── styles/
    ├── index.css                   # Ordered stylesheet imports
    ├── base.css                    # Reset, typography, native controls
    └── theme.css                   # GOELTA tokens, dark mode, final overrides

public/
└── goelta-logo.png                 # Browser-served header logo
```

### Common hand-editing tasks

| Change | Primary file |
|---|---|
| Enable or disable a dashboard module | `src/modules/dashboard/data/applications.ts` |
| Change dashboard layout or widgets | `src/modules/dashboard/Dashboard.tsx` |
| Change header account controls | `WorkspaceHeader.tsx` and `SalesNavigation.tsx` |
| Change routes | `src/app/App.tsx` or `sales/SalesWorkspace.tsx` |
| Change quotation creation UI | `features/quotations/SaleForm.tsx` |
| Change list columns/filters | The feature `*List.tsx` plus `styles/lists.css` |
| Change fields on a record | The feature form/detail plus `styles/records.css` |
| Change colors or dark mode | `src/styles/theme.css` |
| Add an icon | `src/shared/ui/Icon.tsx` |
| Change business behavior | `src/modules/sales/domain/*` |
| Change saving/migration | `src/modules/sales/data/*` |

The CSS import order is significant: `base.css` loads first, feature styles load
next, and `theme.css` loads last so theme and dark-mode rules can override legacy
feature selectors. Prefer existing CSS variables (`--bg`, `--surface`,
`--surface-soft`, `--text`, `--text-soft`, `--border`, `--teal`) instead of new
hard-coded colors.

Keep business mutations in `modules/sales/domain` and commit them through `WorkspaceProvider.transact`. UI components should not write sales storage directly. `domain/workflow.ts` and `data/storage.ts` are public export surfaces; the implementation lives in the focused files beside them. Excel and PDF libraries continue to load on demand.

## Routes and deployment

- `/` is the main dashboard; `/sales` redirects to `/sales/quotations`.
- Sales routes live under `/sales/*`; the GOELTA app-grid link returns to the dashboard.
- Old `/quotations/*`, `/orders`, `/to-invoice`, `/customers/*`, `/invoices/*`, `/purchases/*`, and `/products` URLs redirect with their query strings and fragments intact.
- Build with `npm run build` and serve `dist/` over HTTPS. Configure the host to fall back to `index.html` for client-side paths, including `/sales/*` and legacy links. `npm run preview` is for locally inspecting a build, not a production server.
- Keep the same origin (scheme, host, and port) to retain existing browser records. Moving source folders does not change the storage keys; moving to another origin requires a separate data migration.
- No CDN JavaScript from the reference HTML is used. Charts and icons are local SVG components. The existing DM Sans Google Fonts stylesheet is retained with system-font fallbacks.
