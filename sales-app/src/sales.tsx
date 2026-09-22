import { useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  createInvoice,
  dateAfter,
  event,
  invoiceStatus,
  money,
  newSale,
  productLines,
  profileRecipients,
  saveSale,
  stockWarnings,
  totals,
  transitionSale,
} from "./domain";
import type { Sale, SaleStatus } from "./model";
import { useWorkspace } from "./store";
import {
  Activity,
  Badge,
  Button,
  Empty,
  Field,
  Icon,
  Modal,
  PageHeader,
  Pagination,
  Search,
  StatusBar,
  Tabs,
  Totals,
} from "./ui";
import { Lines } from "./lines";
import { RecipientsEditor } from "./customers";
import { EmailDialog, PdfButton } from "./sharing";

export function SalesList({
  mode = "quotations",
}: {
  mode?: "quotations" | "orders" | "to-invoice";
}) {
  const { state } = useWorkspace();
  const [params] = useSearchParams();
  const customer = params.get("customer");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"date" | "number" | "total">("number");
  const [asc, setAsc] = useState(false);
  const base = state.sales.filter(
    (s) =>
      (!customer || s.customerId === customer) &&
      (mode === "quotations"
        ? true
        : s.status === "Accepted" &&
          (mode !== "to-invoice" || invoiceStatus(state, s) !== "Invoiced")),
  );
  const filtered = base
    .filter(
      (s) =>
        (status === "All" || s.status === status) &&
        [s.number, s.title, s.description, s.customer]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort === "total"
          ? totals(a.lines, a.discount, a.taxRate).total -
            totals(b.lines, b.discount, b.taxRate).total
          : a[sort].localeCompare(b[sort])) * (asc ? 1 : -1),
    );
  const title =
    mode === "orders"
      ? "Sales orders"
      : mode === "to-invoice"
        ? "Orders to invoice"
        : "Quotations";
  const sortBy = (key: typeof sort) => {
    setSort(key);
    setAsc(sort === key ? !asc : true);
  };
  return (
    <>
      <PageHeader
        title={title}
        count={base.length}
        subtitle={
          mode === "quotations"
            ? "From the first conversation to a confirmed order."
            : mode === "orders"
              ? "Confirmed orders, connected to your invoices and purchases."
              : "Create invoices for confirmed customer orders."
        }
        actions={
          <Link className="btn primary" to="/quotations/new">
            <Icon name="plus" />
            New quotation
          </Link>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Quotation pipeline</span>
          <strong>
            {money(
              base
                .filter((s) => ["Draft", "Sent", "Hold"].includes(s.status))
                .reduce(
                  (n, s) => n + totals(s.lines, s.discount, s.taxRate).total,
                  0,
                ),
            )}
          </strong>
          <small>Open opportunities</small>
        </div>
        <div>
          <span>Awaiting a response</span>
          <strong>
            {base.filter((s) => s.status === "Sent").length}
            <small> quotations</small>
          </strong>
          <small>
            <i className="dot blue" />
            Sent to customers
          </small>
        </div>
        <div>
          <span>Confirmed orders</span>
          <strong>
            {base.filter((s) => s.status === "Accepted").length}
            <small> orders</small>
          </strong>
          <small>
            <i className="dot green" />
            Ready for the next step
          </small>
        </div>
        <div>
          <span>To invoice</span>
          <strong>
            {
              base.filter(
                (s) =>
                  s.status === "Accepted" &&
                  invoiceStatus(state, s) !== "Invoiced",
              ).length
            }
            <small> orders</small>
          </strong>
          <Link to="/to-invoice">
            Review orders <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search number, customer or quotation…"
        />
        <div className="filter-select">
          <Icon name="filter" size={16} />
          <select
            aria-label="Quotation status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            {[
              "All",
              "Draft",
              "Sent",
              "Accepted",
              "Hold",
              "Rejected",
              "Cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "All"
                  ? "All statuses"
                  : s === "Accepted"
                    ? "Sales Order"
                    : s}
              </option>
            ))}
          </select>
        </div>
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </div>
      {customer && (
        <div className="filter-banner">
          Customer:{" "}
          {state.companies.find((c) => c.id === customer)?.name || customer}
          <Link to="/quotations">Clear filter</Link>
        </div>
      )}
      <div className="table-scroll list-table">
        <table>
          <thead>
            <tr>
              <th>
                <button onClick={() => sortBy("number")}>
                  Number <Icon name="down" size={12} />
                </button>
              </th>
              <th>Customer / quotation</th>
              <th>
                <button onClick={() => sortBy("date")}>
                  Quotation date <Icon name="down" size={12} />
                </button>
              </th>
              <th>Expiration</th>
              <th className="numeric">
                <button onClick={() => sortBy("total")}>
                  Total <Icon name="down" size={12} />
                </button>
              </th>
              <th>Status</th>
              {mode !== "quotations" && <th>Invoicing</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 12, page * 12 + 12).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link className="record-link mono" to={`/quotations/${s.id}`}>
                    {s.number}
                  </Link>
                </td>
                <td className="customer-quote">
                  <Link to={`/quotations/${s.id}`}>{s.customer}</Link>
                  <span>{s.title || "Untitled quotation"}</span>
                  {s.description && (
                    <small title={s.description}>{s.description}</small>
                  )}
                </td>
                <td>{s.date}</td>
                <td>
                  <span
                    className={
                      s.expiry < dateAfter() &&
                      ["Draft", "Sent"].includes(s.status)
                        ? "overdue"
                        : ""
                    }
                  >
                    {s.expiry}
                  </span>
                </td>
                <td className="numeric amount">
                  {money(totals(s.lines, s.discount, s.taxRate).total)}
                </td>
                <td>
                  <Badge status={s.status} />
                </td>
                {mode !== "quotations" && (
                  <td>
                    <Badge status={invoiceStatus(state, s)} />
                  </td>
                )}
                <td>
                  <Link
                    className="row-open"
                    aria-label={`Open ${s.number}`}
                    to={`/quotations/${s.id}`}
                  >
                    <Icon name="chevron" size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4}>{filtered.length} records</td>
                <td className="numeric">
                  {money(
                    filtered.reduce(
                      (n, s) =>
                        n + totals(s.lines, s.discount, s.taxRate).total,
                      0,
                    ),
                  )}
                </td>
                <td colSpan={mode === "quotations" ? 2 : 3} />
              </tr>
            </tfoot>
          )}
        </table>
        {!filtered.length && (
          <Empty
            title="No quotations found"
            description="Try another search or start a new quotation."
          />
        )}
      </div>
      <p className="list-footnote">
        <Icon name="check" size={14} /> Changes are saved in this browser.
      </p>
    </>
  );
}
export function SaleRoute({ edit = false }: { edit?: boolean }) {
  const { id } = useParams();
  const { state } = useWorkspace();
  const sale = state.sales.find((s) => s.id === id);
  if (id === "new") return <SaleForm key="new" />;
  if (!sale)
    return (
      <Empty
        title="Quotation not found"
        description="This record may have been removed."
        action={<Link to="/quotations">Back to quotations</Link>}
      />
    );
  if (edit)
    return sale.status === "Draft" ? (
      <SaleForm key={sale.id} initial={sale} />
    ) : (
      <Empty
        title="This quotation is locked"
        description="Only draft quotations can be edited."
        action={<Link to={`/quotations/${sale.id}`}>Open record</Link>}
      />
    );
  return <SaleDetail key={sale.id} sale={sale} />;
}
function SaleForm({ initial }: { initial?: Sale }) {
  const { state, transact } = useWorkspace();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() =>
    structuredClone(initial || newSale(state)),
  );
  const [tab, setTab] = useState("lines");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<Sale>) =>
    setDraft((s) => ({ ...s, ...patch }));
  const company = state.companies.find((c) => c.id === draft.customerId);
  const warnings = stockWarnings(draft.lines, state.products);
  const save = (email = false) => {
    const clean = {
      ...draft,
      recipients: draft.recipients
        .filter((r) => r.email.trim())
        .map((r) => ({ ...r, email: r.email.trim() })),
    };
    if (transact((s) => saveSale(s, clean), "Quotation saved"))
      navigate(`/quotations/${draft.id}${email ? "?email=1" : ""}`);
  };
  const importLines = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      const { parseQuotationLines, readWorkbook } = await import("./excel");
      const lines = parseQuotationLines(
        await readWorkbook(f),
        state.extraColumns,
        state.products,
      );
      setDraft((d) => ({ ...d, lines: [...d.lines, ...lines] }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  return (
    <>
      <PageHeader
        title={initial ? draft.number : "New quotation"}
        crumbs={[{ label: "Quotations", to: "/quotations" }]}
        actions={
          <>
            <Button
              variant="primary"
              icon="check"
              disabled={busy}
              onClick={() => save()}
            >
              Save
            </Button>
            <Button icon="mail" disabled={busy} onClick={() => save(true)}>
              Save & email
            </Button>
            <Link
              className="btn ghost"
              to={initial ? `/quotations/${initial.id}` : "/quotations"}
            >
              Discard
            </Link>
          </>
        }
      />
      <StatusBar
        stages={["Quotation", "Quotation Sent", "Sales Order"]}
        current="Quotation"
      />
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <div className="record-sheet">
        <div className="record-heading">
          <span className="eyebrow">Sales quotation</span>
          <input
            aria-label="Quotation number"
            className="record-number-input"
            value={draft.number}
            onChange={(e) => update({ number: e.target.value })}
          />
          <input
            aria-label="Quotation title"
            className="title-input"
            placeholder="Quotation title"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
          />
          <textarea
            aria-label="Quotation description"
            className="description-input"
            placeholder="Add a description of this quotation…"
            rows={2}
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
        <div className="form-grid">
          <Field label="Customer" required>
            <select
              value={draft.customerId}
              onChange={(e) => {
                const c = state.companies.find((c) => c.id === e.target.value);
                update({
                  customerId: e.target.value,
                  recipients: c ? profileRecipients(c) : [],
                });
              }}
            >
              <option value="">Select a customer…</option>
              {state.companies
                .filter(
                  (c) => c.status === "Active" || c.id === draft.customerId,
                )
                .map((c) => (
                  <option
                    value={c.id}
                    key={c.id}
                    disabled={c.status === "Inactive"}
                  >
                    {c.name}
                    {c.status === "Inactive" ? " (Inactive)" : ""}
                  </option>
                ))}
            </select>
            {company && (
              <small>
                {[company.address, company.city, company.email]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            )}
            <Link className="text-link" to="/customers/new">
              Create a customer
            </Link>
          </Field>
          <div className="two-fields">
            <Field label="Quotation date" required>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            </Field>
            <Field label="Expiration" required>
              <input
                type="date"
                value={draft.expiry}
                onChange={(e) => update({ expiry: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <Tabs
          tabs={[
            {
              id: "lines",
              label: "Order lines",
              count: productLines(draft.lines).length,
            },
            {
              id: "recipients",
              label: "Recipients",
              count: draft.recipients.filter((r) => r.email).length,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "lines" ? (
          <>
            <div className="line-toolbar">
              <span>Add products directly to the order.</span>
              <div>
                <Button
                  variant="ghost"
                  icon="download"
                  onClick={async () => {
                    try {
                      (await import("./excel")).downloadSchema(
                        state.extraColumns,
                        true,
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Excel schema
                </Button>
                <Button
                  variant="ghost"
                  icon="upload"
                  disabled={busy}
                  onClick={() => file.current?.click()}
                >
                  {busy ? "Importing…" : "Import lines"}
                </Button>
                <input
                  ref={file}
                  type="file"
                  aria-label="Import quotation Excel file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={(e) => void importLines(e.target.files?.[0])}
                />
              </div>
            </div>
            <Lines
              lines={draft.lines}
              onChange={(lines) => update({ lines })}
              products={state.products}
            />
            {warnings.length > 0 && (
              <div className="alert warning">
                {warnings.join(" ")} Confirming this order may require a
                purchase.
              </div>
            )}
            <div className="document-bottom">
              <Field
                label="Customer notes"
                hint="Appears underneath the products on documents and invoices."
              >
                <textarea
                  rows={4}
                  placeholder="Terms, delivery instructions, or a note for your customer…"
                  value={draft.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </Field>
              <Totals
                lines={draft.lines}
                discount={draft.discount}
                taxRate={draft.taxRate}
                onDiscount={(discount) => update({ discount })}
                onTax={(taxRate) => update({ taxRate })}
              />
            </div>
          </>
        ) : (
          <div className="tab-panel">
            <RecipientsEditor
              key={draft.customerId}
              company={company}
              recipients={draft.recipients}
              onChange={(recipients) => update({ recipients })}
            />
          </div>
        )}
      </div>
    </>
  );
}
function SaleDetail({ sale }: { sale: Sale }) {
  const { state, transact, error: storeError } = useWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("lines");
  const [email, setEmail] = useState(params.get("email") === "1");
  const [invoice, setInvoice] = useState(false);
  const [cancel, setCancel] = useState(false);
  const invoices = state.invoices.filter((i) => i.saleId === sale.id);
  const purchases = state.purchases.filter((p) => p.saleId === sale.id);
  const activePurchase = purchases.find((p) => p.status !== "Cancelled");
  const transition = (status: SaleStatus) =>
    transact(
      (s) => transitionSale(s, sale.id, status),
      status === "Accepted" ? "Sales order confirmed" : "Status updated",
    );
  const duplicate = () => {
    const copy = {
      ...structuredClone(sale),
      ...newSale(state),
      title: sale.title + " (copy)",
      description: sale.description,
      customerId: sale.customerId,
      lines: structuredClone(sale.lines),
      recipients: structuredClone(sale.recipients),
      discount: sale.discount,
      taxRate: sale.taxRate,
      notes: sale.notes,
    };
    if (transact((s) => saveSale(s, copy), "Quotation duplicated"))
      navigate(`/quotations/${copy.id}/edit`);
  };
  return (
    <>
      <PageHeader
        title={sale.number}
        crumbs={[
          {
            label: sale.status === "Accepted" ? "Sales orders" : "Quotations",
            to: sale.status === "Accepted" ? "/orders" : "/quotations",
          },
        ]}
        actions={
          <>
            <PdfButton document={sale} kind="sale" />
            <Button icon="copy" onClick={duplicate}>
              Duplicate
            </Button>
          </>
        }
      />
      <StatusBar
        stages={["Quotation", "Quotation Sent", "Sales Order"]}
        current={
          sale.status === "Accepted"
            ? "Sales Order"
            : sale.status === "Draft"
              ? "Quotation"
              : sale.status === "Sent"
                ? "Quotation Sent"
                : sale.status
        }
        actions={
          <>
            {sale.status === "Draft" && (
              <Link
                className="btn secondary"
                to={`/quotations/${sale.id}/edit`}
              >
                Edit
              </Link>
            )}
            {["Draft", "Sent", "Hold"].includes(sale.status) && (
              <>
                <Button
                  variant="primary"
                  onClick={() => transition("Accepted")}
                >
                  Confirm order
                </Button>
                <Button icon="mail" onClick={() => setEmail(true)}>
                  Send by email
                </Button>
              </>
            )}
            {sale.status === "Accepted" && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setInvoice(true)}
                  disabled={invoiceStatus(state, sale) === "Invoiced"}
                >
                  Create invoice
                </Button>
                {!activePurchase && (
                  <Link
                    className="btn secondary"
                    to={`/purchases/new?sale=${sale.id}`}
                  >
                    Create RFQ
                  </Link>
                )}
              </>
            )}
            {["Hold", "Rejected", "Cancelled"].includes(sale.status) && (
              <Button onClick={() => transition("Draft")}>
                Set to quotation
              </Button>
            )}
            {["Draft", "Sent"].includes(sale.status) && (
              <Button variant="ghost" onClick={() => transition("Hold")}>
                Hold
              </Button>
            )}
            {["Sent", "Hold"].includes(sale.status) && (
              <Button variant="ghost" onClick={() => transition("Rejected")}>
                Reject
              </Button>
            )}
            {!["Rejected", "Cancelled"].includes(sale.status) && (
              <Button variant="ghost" onClick={() => setCancel(true)}>
                Cancel
              </Button>
            )}
          </>
        }
      />
      <div className="record-layout">
        <div className="record-sheet">
          <div className="smart-buttons">
            {invoices.length > 0 && (
              <Link to={`/invoices?sale=${sale.id}`}>
                <Icon name="file" />
                <span>
                  <strong>{invoices.length}</strong> Invoices
                </span>
              </Link>
            )}
            {purchases.length > 0 && (
              <Link to={`/purchases?sale=${sale.id}`}>
                <Icon name="box" />
                <span>
                  <strong>{purchases.length}</strong> Purchases
                </span>
              </Link>
            )}
          </div>
          <div className="record-heading">
            <span className="eyebrow">
              {sale.status === "Accepted" ? "Sales order" : "Sales quotation"}
              {sale.isDemo && " · Demo"}
            </span>
            <h2>{sale.title || sale.number}</h2>
            {sale.description && <p className="preserve">{sale.description}</p>}
          </div>
          <div className="record-meta">
            <div>
              <span>Customer</span>
              <Link
                to={`/customers/${sale.customerId}`}
                className="customer-name"
              >
                {sale.customer}
              </Link>
              <p>{sale.customerAddress}</p>
              <p>{sale.customerEmail}</p>
              <p>{sale.customerPhone}</p>
            </div>
            <dl>
              <div>
                <dt>Quotation date</dt>
                <dd>{sale.date}</dd>
              </div>
              <div>
                <dt>Expiration</dt>
                <dd>{sale.expiry}</dd>
              </div>
              <div>
                <dt>Invoicing policy</dt>
                <dd>Ordered quantities</dd>
              </div>
              {sale.status === "Accepted" && (
                <div>
                  <dt>Invoice status</dt>
                  <dd>
                    <Badge status={invoiceStatus(state, sale)} />
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <Tabs
            tabs={[
              {
                id: "lines",
                label: "Order lines",
                count: productLines(sale.lines).length,
              },
              {
                id: "recipients",
                label: "Recipients",
                count: sale.recipients.length,
              },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === "lines" ? (
            <>
              <Lines lines={sale.lines} />
              <div className="document-bottom">
                <div className="document-notes">
                  {sale.notes && (
                    <>
                      <h4>Notes & terms</h4>
                      <p className="preserve">{sale.notes}</p>
                    </>
                  )}
                </div>
                <Totals
                  lines={sale.lines}
                  discount={sale.discount}
                  taxRate={sale.taxRate}
                />
              </div>
            </>
          ) : (
            <div className="tab-panel">
              {sale.recipients.length ? (
                sale.recipients.map((r) => (
                  <div className="recipient-row" key={r.email}>
                    <span className="badge purple">{r.role}</span>
                    <strong>{r.name}</strong>
                    <span>{r.email}</span>
                  </div>
                ))
              ) : (
                <p className="muted">
                  No recipients recorded. Choose recipients when sending by
                  email.
                </p>
              )}
            </div>
          )}
        </div>
        <Activity
          events={sale.history}
          onNote={(message) =>
            transact((s) => {
              s.sales
                .find((q) => q.id === sale.id)!
                .history.push(event(message));
            }, "Note added")
          }
        />
      </div>
      {email && (
        <EmailDialog
          sale={sale}
          onClose={() => {
            setEmail(false);
            params.delete("email");
            setParams(params, { replace: true });
          }}
        />
      )}
      {invoice && (
        <CreateInvoice sale={sale} onClose={() => setInvoice(false)} />
      )}
      {cancel && (
        <Modal
          title={`Cancel ${sale.number}?`}
          onClose={() => setCancel(false)}
          footer={
            <>
              <Button onClick={() => setCancel(false)}>Keep document</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (transition("Cancelled")) setCancel(false);
                }}
              >
                Cancel document
              </Button>
            </>
          }
        >
          <p>
            This record stays in your history. Linked invoices and purchases
            must be cancelled first.
          </p>
          {storeError && (
            <p role="alert" className="alert error">
              {storeError}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
function CreateInvoice({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { state, transact, error: storeError } = useWorkspace();
  const navigate = useNavigate();
  const [kind, setKind] = useState<"regular" | "percentage" | "fixed">(
    "regular",
  );
  const [amount, setAmount] = useState(30);
  return (
    <Modal
      title="Create invoice"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Discard</Button>
          <Button
            variant="primary"
            onClick={() => {
              let id = "";
              if (
                transact((s) => {
                  id = createInvoice(s, sale.id, kind, amount);
                }, "Draft invoice created")
              )
                navigate(`/invoices/${id}`);
            }}
          >
            Create draft invoice
          </Button>
        </>
      }
    >
      <p>
        Invoice <strong>{sale.number}</strong> · {sale.customer}
      </p>
      {storeError && (
        <p role="alert" className="alert error">
          {storeError}
        </p>
      )}
      <div className="radio-options">
        {(
          [
            [
              "regular",
              "Regular invoice",
              "Invoice the order, deducting any posted down payments.",
            ],
            [
              "percentage",
              "Down payment (percentage)",
              "Request a percentage of the order total.",
            ],
            [
              "fixed",
              "Down payment (fixed amount)",
              "Request a specific deposit amount before tax.",
            ],
          ] as const
        ).map(([key, title, text]) => (
          <label key={key}>
            <input
              type="radio"
              name="invoice-kind"
              checked={kind === key}
              onChange={() => setKind(key)}
            />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </label>
        ))}
      </div>
      {kind !== "regular" && (
        <Field
          label={
            kind === "percentage"
              ? "Down payment (%)"
              : "Down payment before tax ($)"
          }
        >
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.valueAsNumber)}
          />
        </Field>
      )}
      <div className="info-box">
        Order total{" "}
        <strong>
          {money(totals(sale.lines, sale.discount, sale.taxRate).total)}
        </strong>
      </div>
      {state.invoices.some(
        (i) => i.saleId === sale.id && i.status === "Draft",
      ) && (
        <p className="alert warning">
          An invoice is already in draft. Post or cancel it before creating
          another.
        </p>
      )}
    </Modal>
  );
}
