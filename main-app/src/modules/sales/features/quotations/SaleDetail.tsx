import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Icon,
  Modal,
  PageHeader,
  StatusBar,
  Tabs,
} from "../../../../shared/ui/index";
import { Activity } from "../../components/Activity";
import { Lines } from "../../components/LineEditor";
import { EmailDialog, PdfButton } from "../../components/sharing/index";
import { Totals } from "../../components/Totals";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Sale, SaleStatus } from "../../domain/types";
import {
  event,
  invoiceStatus,
  newSale,
  productLines,
  saveSale,
  transitionSale,
} from "../../domain/workflow";
import { CreateInvoice } from "./CreateInvoice";

export function SaleDetail({ sale }: { sale: Sale }) {
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
      navigate(`/sales/quotations/${copy.id}/edit`);
  };
  return (
    <>
      <PageHeader
        title={sale.number}
        crumbs={[
          {
            label: sale.status === "Accepted" ? "Sales orders" : "Quotations",
            to:
              sale.status === "Accepted"
                ? "/sales/orders"
                : "/sales/quotations",
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
                to={`/sales/quotations/${sale.id}/edit`}
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
                    to={`/sales/purchases/new?sale=${sale.id}`}
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
              <Link to={`/sales/invoices?sale=${sale.id}`}>
                <Icon name="file" />
                <span>
                  <strong>{invoices.length}</strong> Invoices
                </span>
              </Link>
            )}
            {purchases.length > 0 && (
              <Link to={`/sales/purchases?sale=${sale.id}`}>
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
                to={`/sales/customers/${sale.customerId}`}
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
