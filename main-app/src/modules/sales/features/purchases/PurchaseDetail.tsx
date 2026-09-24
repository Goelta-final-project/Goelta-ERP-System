import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Icon,
  Modal,
  PageHeader,
  StatusBar,
} from "../../../../shared/ui/index";
import { Activity } from "../../components/Activity";
import { Lines } from "../../components/LineEditor";
import { buildMailto, PdfButton } from "../../components/sharing/index";
import { Totals } from "../../components/Totals";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Purchase } from "../../domain/types";
import { transitionPurchase } from "../../domain/workflow";

export function PurchaseDetail({ purchase: p }: { purchase: Purchase }) {
  const { state, transact, error } = useWorkspace();
  const [cancel, setCancel] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [email, setEmail] = useState(false);
  const [opened, setOpened] = useState(false);
  const sale = state.sales.find((s) => s.id === p.saleId);
  const transition = (status: Purchase["status"]) =>
    transact(
      (s) => transitionPurchase(s, p.id, status),
      status === "Received"
        ? "Products received and stock updated"
        : "Purchase status updated",
    );
  let mailto = "";
  try {
    mailto = buildMailto(
      p.vendorEmail,
      [],
      `GOELTA request for quotation ${p.number}`,
      `Dear ${p.vendor},\n\nPlease review the attached request for quotation ${p.number} and confirm your prices and availability.\nExpected arrival: ${p.expectedDate}.\n\nKind regards,\nGOELTA`,
    );
  } catch {
    /* Email dialog explains missing email. */
  }
  return (
    <>
      <PageHeader
        title={p.number}
        crumbs={[{ label: "Purchase orders", to: "/sales/purchases" }]}
        actions={<PdfButton document={p} kind="purchase" />}
      />
      <StatusBar
        stages={["RFQ", "RFQ Sent", "Purchase Order", "Received"]}
        current={p.status}
        actions={
          <>
            {p.status === "RFQ" && (
              <Link
                className="btn secondary"
                to={`/sales/purchases/${p.id}/edit`}
              >
                Edit
              </Link>
            )}
            {["RFQ", "RFQ Sent"].includes(p.status) && (
              <>
                <Button
                  variant="primary"
                  onClick={() => transition("Purchase Order")}
                >
                  Confirm order
                </Button>
                <Button icon="mail" onClick={() => setEmail(true)}>
                  Send by email
                </Button>
              </>
            )}
            {p.status === "RFQ Sent" && (
              <Button onClick={() => transition("RFQ")}>Set to RFQ</Button>
            )}
            {p.status === "Purchase Order" && (
              <Button
                variant="primary"
                icon="box"
                onClick={() => setReceipt(true)}
              >
                Receive products
              </Button>
            )}
            {!["Received", "Cancelled"].includes(p.status) && (
              <Button variant="ghost" onClick={() => setCancel(true)}>
                Cancel
              </Button>
            )}
          </>
        }
      />
      <div className="record-layout">
        <div className="record-sheet">
          {sale && (
            <div className="smart-buttons">
              <Link to={`/sales/quotations/${sale.id}`}>
                <Icon name="file" />
                <span>
                  Sales order <strong>{sale.number}</strong>
                </span>
              </Link>
            </div>
          )}
          <div className="record-heading">
            <span className="eyebrow">
              {["RFQ", "RFQ Sent"].includes(p.status)
                ? "Request for quotation"
                : "Purchase order"}
            </span>
            <h2>{p.number}</h2>
            <Badge status={p.status} />
          </div>
          <div className="record-meta">
            <div>
              <span>Vendor</span>
              <strong className="customer-name">{p.vendor}</strong>
              <p>{p.vendorEmail || "No email recorded"}</p>
            </div>
            <dl>
              <div>
                <dt>Order date</dt>
                <dd>{p.date}</dd>
              </div>
              <div>
                <dt>Expected arrival</dt>
                <dd>{p.expectedDate}</dd>
              </div>
              {sale && (
                <div>
                  <dt>Source</dt>
                  <dd>{sale.number}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="static-tab">Products</div>
          <Lines lines={p.lines} />
          <div className="document-bottom">
            <div className="document-notes">
              <h4>Notes & terms</h4>
              <p className="preserve">{p.notes || "No notes recorded."}</p>
            </div>
            <Totals lines={p.lines} taxRate={p.taxRate} />
          </div>
        </div>
        <Activity events={p.history} />
      </div>
      {cancel && (
        <Modal
          title={`Cancel ${p.number}?`}
          onClose={() => setCancel(false)}
          footer={
            <>
              <Button onClick={() => setCancel(false)}>Keep purchase</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (transition("Cancelled")) setCancel(false);
                }}
              >
                Cancel purchase
              </Button>
            </>
          }
        >
          <p>This purchase stays in your history. No stock will be added.</p>
          {error && <p className="alert error">{error}</p>}
        </Modal>
      )}
      {receipt && (
        <Modal
          title="Receive products"
          onClose={() => setReceipt(false)}
          footer={
            <>
              <Button onClick={() => setReceipt(false)}>Discard</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (transition("Received")) setReceipt(false);
                }}
              >
                Validate receipt
              </Button>
            </>
          }
        >
          <p>
            Confirm that all products on <strong>{p.number}</strong> have
            arrived. Catalog stock will increase by the ordered quantities.
            Custom lines remain recorded on this purchase.
          </p>
          {error && <p className="alert error">{error}</p>}
        </Modal>
      )}
      {email && (
        <Modal
          title="Email request for quotation"
          onClose={() => setEmail(false)}
          footer={<Button onClick={() => setEmail(false)}>Close</Button>}
        >
          <p>
            Download the RFQ, open your email app, and attach the PDF before
            sending.
          </p>
          <div className="actions">
            <PdfButton document={p} kind="purchase" />
            {mailto ? (
              <a
                className="btn primary"
                href={mailto}
                onClick={() => setOpened(true)}
              >
                Open email draft
              </a>
            ) : (
              <span className="alert warning">
                Add a vendor email to this RFQ first.
              </span>
            )}
          </div>
          {opened && p.status === "RFQ" && (
            <Button
              onClick={() => {
                if (transition("RFQ Sent")) setEmail(false);
              }}
            >
              I sent this email — mark as sent
            </Button>
          )}
        </Modal>
      )}
    </>
  );
}
