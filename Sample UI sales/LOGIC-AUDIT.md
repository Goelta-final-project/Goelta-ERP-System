# Sales frontend logic audit

Reviewed on 2026-09-15. Scope: customer companies and contacts, recipient profiles, Excel catalog/templates, quotation creation and status changes, local persistence, quotation view, PDF and email handoff. Dashboard behavior was preserved as requested.

## Corrected

- Quotations, customer companies, catalog items and custom template headings use validated browser storage. Failed writes remain visible; malformed saved data is protected from replacement. Saves detect intervening writes from another tab.
- Duplicate quotation numbers are rejected instead of overwriting an existing quotation. New numbers use a random UUID suffix.
- Shared monetary calculations validate amounts, round each line and tax consistently, and reject excessive discounts, invalid tax percentages and numeric overflow.
- Stock validation combines repeated product lines and uses the current catalog. Services have no stock limit. This validates availability only; quotations do not reserve or deduct stock.
- Dates use the local calendar day. Invalid dates and expiry dates before the quotation date cannot be saved.
- Contacts may have no personal name. Recipient selection cleans stale IDs and duplicate addresses; company emails and contact emails can be used in To/CC profiles.
- Excel imports require exact configured headers and valid complete rows. Missing/unknown/duplicate headings, duplicate product IDs and invalid numeric cells produce errors without replacing the existing catalog. Error messages preserve spreadsheet row numbers.
- Both template download paths use the same workbook generator. Custom columns persist, round-trip through Excel, appear in preview and are copied into quotation lines. Previously imported attributes remain visible after template configuration changes.
- Pending manual lines and pending template headings cannot be silently discarded by saving. A cleared manual rate is invalid rather than becoming zero.
- Opening an email draft or sharing a PDF no longer automatically marks a quotation Sent. Users explicitly confirm sending in their email app. Confirmed recipients are saved with the status change.
- Status transitions are checked centrally and recorded. Accepted and Rejected quotations cannot be reset by the status menu.
- Quotation details no longer conditionally call React hooks. Item numbers, units and custom attributes appear in the view and PDF; only demo records receive a demo label.

## Validation

- `npm test`: 13 regression tests (the Node runner may summarize these as one passing test file). `node tests/sales.test.mjs` shows individual cases.
- Tests cover money, stock, dates, duplicate IDs, transitions, a real XLSX round-trip, strict import failures, optional contact names, recipient cleanup, email encoding, PDF generation/pagination, record validation, persistence, quota errors, conflicting tabs and corrupt storage.
- TypeScript and Vite production build passed. Vite reports a large bundle warning.
- Rendered and visually inspected a one-page quotation and all nine pages of a 90-line quotation, including custom attributes and totals.
- Interactive browser testing was unavailable in this session. No email was sent.

## Remaining boundaries

- This is a browser-only demo, without a shared database, authentication, server-side validation or email delivery service. Local storage is not a multi-user database; the conflict check is best-effort and not an atomic transaction across browser tabs.
- Email uses an external email application. Attaching the downloaded PDF and sending remain user actions; the frontend cannot verify delivery.
- Sales orders and dashboard metrics remain sample data. Accepted quotations do not create orders or update inventory.
- Currency remains the application's existing dollar format. PDF text uses built-in Helvetica; a Unicode font is needed for reliable Sinhala/Tamil and other unsupported scripts.
- Template headings are stored as the active configuration, not as a history of versioned schemas. Old workbooks must satisfy the active headings. No column-name mapping is performed.
- `npm audit` reports five dependency advisories: Vite and SheetJS/xlsx (high), esbuild and React Router packages (moderate). The offered Vite/Router fixes require major upgrades; the npm `xlsx` package has no registry fix. These upgrades were not applied in this application-logic pass and remain outstanding before production use.

This audit fixes the identified application logic defects; it is not a guarantee that every possible defect has been eliminated.
