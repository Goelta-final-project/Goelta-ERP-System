import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  amountDue,
  cancelInvoice,
  dateAfter,
  event,
  invoiceLabel,
  invoiceTotal,
  money,
  paidAmount,
  postInvoice,
  registerPayment,
} from "./domain";
import type { Invoice } from "./model";
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
  Totals,
} from "./ui";
import { Lines } from "./lines";
import { PdfButton } from "./sharing";

export function InvoiceList() {
  const { state } = useWorkspace();
  const [params] = useSearchParams();
  const saleId = params.get("sale");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const filtered = state.invoices.filter(
    (i) =>
      (!saleId || i.saleId === saleId) &&
      (status === "All" || invoiceLabel(i) === status) &&
      `${i.number} ${i.customer} ${state.sales.find((s) => s.id === i.saleId)?.number}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Customer invoices"
        count={state.invoices.length}
        subtitle="Review, post and record payments against your sales invoices."
        actions={
          <Link className="btn primary" to="/to-invoice">
            <Icon name="plus" />
            Invoice a sales order
          </Link>
        }
      />
      <div className="summary-strip three">
        <div>
          <span>Draft invoices</span>
          <strong>
            {state.invoices.filter((i) => i.status === "Draft").length}
          </strong>
          <small>Ready for review</small>
        </div>
        <div>
          <span>Amount outstanding</span>
          <strong>
            {money(
              state.invoices
                .filter((i) => i.status === "Posted")
                .reduce((sum, i) => sum + amountDue(i), 0),
            )}
          </strong>
          <small>Posted invoices</small>
        </div>
        <div>
          <span>Payments recorded</span>
          <strong>
            {money(state.invoices.reduce((sum, i) => sum + paidAmount(i), 0))}
          </strong>
          <small>
            <i className="dot green" />
            Customer payments
          </small>
        </div>
      </div>
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search invoices or customers…"
        />
        <select
          aria-label="Invoice status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          {[
            "All",
            "Draft",
            "Posted",
            "Partially paid",
            "Paid",
            "Cancelled",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </div>
      {saleId && (
        <div className="filter-banner">
          Sales order: {state.sales.find((s) => s.id === saleId)?.number}
          <Link to="/invoices">Clear filter</Link>
        </div>
      )}
      <div className="table-scroll list-table">
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Invoice date</th>
              <th>Due date</th>
              <th className="numeric">Total</th>
              <th className="numeric">Amount due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 12, page * 12 + 12).map((i) => (
              <tr key={i.id}>
                <td>
                  <Link className="record-link mono" to={`/invoices/${i.id}`}>
                    {i.number}
                  </Link>
                  <small className="table-subtitle">
                    {i.kind === "downpayment"
                      ? "Down payment"
                      : "Regular invoice"}
                  </small>
                </td>
                <td>{i.customer}</td>
                <td>
                  <Link className="text-link" to={`/quotations/${i.saleId}`}>
                    {state.sales.find((s) => s.id === i.saleId)?.number}
                  </Link>
                </td>
                <td>{i.date}</td>
                <td
                  className={
                    i.status === "Posted" &&
                    amountDue(i) > 0 &&
                    i.dueDate < dateAfter()
                      ? "overdue"
                      : ""
                  }
                >
                  {i.dueDate}
                </td>
                <td className="numeric amount">{money(invoiceTotal(i))}</td>
                <td className="numeric">
                  {i.status === "Cancelled" ? "—" : money(amountDue(i))}
                </td>
                <td>
                  <Badge status={invoiceLabel(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <Empty
            title="Your invoices start with a sales order"
            description="Confirm a quotation, then create a draft invoice from the order."
            action={
              <Link className="btn secondary" to="/to-invoice">
                View orders to invoice <Icon name="arrow" />
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
export function InvoiceRoute() {
  const { id } = useParams();
  const { state } = useWorkspace();
  const invoice = state.invoices.find((i) => i.id === id);
  return invoice ? (
    <InvoiceDetail key={`${id}-${invoice.status}`} invoice={invoice} />
  ) : (
    <Empty
      title="Invoice not found"
      description="Choose an invoice from the list."
      action={<Link to="/invoices">Back to invoices</Link>}
    />
  );
}
function InvoiceDetail({ invoice: i }: { invoice: Invoice }) {
  const { state, transact, error: storeError } = useWorkspace();
  const [notes, setNotes] = useState(i.notes);
  const [date, setDate] = useState(i.date);
  const [dueDate, setDueDate] = useState(i.dueDate);
  const [payment, setPayment] = useState(false);
  const [cancel, setCancel] = useState(false);
  const sale = state.sales.find((s) => s.id === i.saleId)!;
  const save = (post = false) =>
    transact(
      (s) => {
        const record = s.invoices.find((row) => row.id === i.id)!;
        if (record.status !== "Draft")
          throw Error("Only draft invoices can be edited.");
        record.notes = notes;
        record.date = date;
        record.dueDate = dueDate;
        if (post) postInvoice(s, i.id);
        else record.history.push(event("Invoice updated"));
      },
      post ? "Invoice posted" : "Invoice saved",
    );
  return (
    <>
      <PageHeader
        title={i.number}
        crumbs={[{ label: "Invoices", to: "/invoices" }]}
        actions={<PdfButton document={i} kind="invoice" />}
      />
      <StatusBar
        stages={["Draft", "Posted", "Paid"]}
        current={
          i.status === "Cancelled"
            ? "Cancelled"
            : invoiceLabel(i) === "Partially paid"
              ? "Posted"
              : invoiceLabel(i)
        }
        actions={
          <>
            {i.status === "Draft" && (
              <>
                <Button variant="primary" onClick={() => save(true)}>
                  Confirm / Post
                </Button>
                <Button icon="check" onClick={() => save()}>
                  Save changes
                </Button>
              </>
            )}
            {i.status === "Posted" && amountDue(i) > 0 && (
              <Button variant="primary" onClick={() => setPayment(true)}>
                Register payment
              </Button>
            )}
            {i.status !== "Cancelled" && !i.payments.length && (
              <Button variant="ghost" onClick={() => setCancel(true)}>
                Cancel invoice
              </Button>
            )}
          </>
        }
      />
      <div className="record-layout">
        <div className="record-sheet">
          <div className="smart-buttons">
            <Link to={`/quotations/${i.saleId}`}>
              <Icon name="file" />
              <span>
                Sales order <strong>{sale.number}</strong>
              </span>
            </Link>
          </div>
          <div className="record-heading">
            <span className="eyebrow">
              {i.kind === "downpayment"
                ? "Down payment invoice"
                : "Customer invoice"}
            </span>
            <h2>{i.number}</h2>
            <Badge status={invoiceLabel(i)} />
          </div>
          <div className="record-meta">
            <div>
              <span>Customer</span>
              <strong className="customer-name">{i.customer}</strong>
              <p>{i.customerAddress}</p>
              <p>{i.customerEmail}</p>
            </div>
            {i.status === "Draft" ? (
              <div className="two-fields">
                <Field label="Invoice date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field label="Due date">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <dl>
                <div>
                  <dt>Invoice date</dt>
                  <dd>{i.date}</dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>{i.dueDate}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{sale.number}</dd>
                </div>
              </dl>
            )}
          </div>
          <div className="static-tab">Invoice lines</div>
          <Lines lines={i.lines} />
          <div className="document-bottom">
            {i.status === "Draft" ? (
              <Field
                label="Notes & terms"
                hint="Shown underneath the products table in the invoice PDF."
              >
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add customer-facing notes…"
                />
              </Field>
            ) : (
              <div className="document-notes">
                <h4>Notes & terms</h4>
                <p className="preserve">{i.notes || "No notes recorded."}</p>
              </div>
            )}
            <Totals
              lines={i.lines}
              discount={i.discount}
              taxRate={i.taxRate}
              deduction={i.deduction}
              deductionTax={i.deductionTax}
            />
          </div>
          {i.status !== "Cancelled" && (
            <div className="payment-summary">
              <span>Amount due</span>
              <strong>{money(amountDue(i))}</strong>
            </div>
          )}
          {i.payments.length > 0 && (
            <div className="tab-panel">
              <h3>Payments</h3>
              {i.payments.map((p) => (
                <div className="payment-row" key={p.id}>
                  <Icon name="check" />
                  <span>{p.date}</span>
                  <span>{p.reference || "Payment"}</span>
                  <strong>{money(p.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <Activity events={i.history} />
      </div>
      {payment && (
        <PaymentDialog invoice={i} onClose={() => setPayment(false)} />
      )}
      {cancel && (
        <Modal
          title={`Cancel ${i.number}?`}
          onClose={() => setCancel(false)}
          footer={
            <>
              <Button onClick={() => setCancel(false)}>Keep invoice</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    transact((s) => cancelInvoice(s, i.id), "Invoice cancelled")
                  )
                    setCancel(false);
                }}
              >
                Cancel invoice
              </Button>
            </>
          }
        >
          <p>
            The invoice remains in your history and the order becomes eligible
            for invoicing again.
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
function PaymentDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const { transact, error } = useWorkspace();
  const [amount, setAmount] = useState(amountDue(invoice));
  const [date, setDate] = useState(dateAfter());
  const [reference, setReference] = useState("");
  return (
    <Modal
      title="Register payment"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Discard</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (
                transact(
                  (s) =>
                    registerPayment(s, invoice.id, amount, date, reference),
                  "Payment recorded",
                )
              )
                onClose();
            }}
          >
            Record payment
          </Button>
        </>
      }
    >
      <div className="info-box">
        Amount due<strong>{money(amountDue(invoice))}</strong>
      </div>
      <Field label="Amount ($)" required>
        <input
          type="number"
          min="0.01"
          max={amountDue(invoice)}
          step="0.01"
          value={Number.isNaN(amount) ? "" : amount}
          onChange={(e) => setAmount(e.target.valueAsNumber)}
        />
      </Field>
      <Field label="Payment date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <Field label="Payment reference">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Bank transfer reference…"
        />
      </Field>
      <small>
        This records a payment received. It does not transfer funds.
      </small>
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
    </Modal>
  );
}
