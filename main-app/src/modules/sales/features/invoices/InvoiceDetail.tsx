import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Field,
  Icon,
  Modal,
  PageHeader,
  StatusBar,
} from "../../../../shared/ui/index";
import { Activity } from "../../components/Activity";
import { Lines } from "../../components/LineEditor";
import { PdfButton } from "../../components/sharing/index";
import { Totals } from "../../components/Totals";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Invoice } from "../../domain/types";
import {
  amountDue,
  cancelInvoice,
  event,
  invoiceLabel,
  money,
  postInvoice,
} from "../../domain/workflow";
import { PaymentDialog } from "./PaymentDialog";

export function InvoiceDetail({ invoice: i }: { invoice: Invoice }) {
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
        crumbs={[{ label: "Invoices", to: "/sales/invoices" }]}
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
            <Link to={`/sales/quotations/${i.saleId}`}>
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
