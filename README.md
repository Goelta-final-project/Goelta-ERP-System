# GOELTA ERP System

The React + TypeScript business workspace is in [`main-app/`](main-app/README.md). It combines the main dashboard and the sales application in one app.

```sh
cd main-app
npm ci
npm run dev
```

Open `/` for the dashboard and `/sales` for sales. Existing sales URLs redirect to their new locations. Includes quotations, sales orders, customer invoices/payments, vendor RFQs/purchase orders, customers, products, Excel imports and PDF exports.

The dashboard adds application navigation, record search, financial activity from saved documents, and persistent personal tasks. Records remain in browser local storage; backend persistence and authentication are not connected. See the [app documentation](main-app/README.md) for structure, verification, and deployment.

## UI source map

The full annotated tree and hand-editing guide are in
[main-app/README.md](main-app/README.md#ui-code-tree). At a glance:

```text
main-app/src/
├── app/                 routing and application-level behavior
├── modules/dashboard/   main menu, search, metrics, chart, and tasks
├── modules/sales/       sales screens, domain rules, data, and services
├── shared/ui/           reusable controls and local SVG icons
├── shared/hooks/        validated browser persistence
└── styles/              global tokens, typography, and dark-mode overrides
```

Start visual changes in `main-app/src/styles/theme.css`. Start screen changes
in the relevant file under `modules/dashboard` or `modules/sales/features`.
Keep business mutations in `modules/sales/domain` and save them through
`WorkspaceProvider.transact`.
