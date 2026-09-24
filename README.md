# GOELTA ERP System

The React + TypeScript business workspace is in [`main-app/`](main-app/README.md). It combines the main dashboard and the sales application in one app.

```sh
cd main-app
npm ci
npm run dev
```

Open `/` for the dashboard and `/sales` for sales. Existing sales URLs redirect to their new locations. Includes quotations, sales orders, customer invoices/payments, vendor RFQs/purchase orders, customers, products, Excel imports and PDF exports.

The dashboard adds application navigation, record search, financial activity from saved documents, and persistent personal tasks. Records remain in browser local storage; backend persistence and authentication are not connected. See the [app documentation](main-app/README.md) for structure, verification, and deployment.
