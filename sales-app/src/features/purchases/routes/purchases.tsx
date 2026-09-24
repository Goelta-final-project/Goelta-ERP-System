import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  money,
  newPurchase,
  savePurchase,
  totals,
  transitionPurchase,
} from "../../../types/domain";
import type { Purchase } from "../../../types/model";
import { useWorkspace } from "../../../store/store";
import {
  Activity,
  Badge,
  Button,
  Empty,
  Field,
  Icon,
  Modal,
  Pagination,
  Search,
  StatusBar,
  Totals,
} from "../../../components/ui/ui";
import { Lines } from "../../../lines";
import { buildMailto, PdfButton } from "../../../sharing";
import TitleHeader from "../../../components/shared/title-header";

export function PurchaseList() {
  const { state } = useWorkspace();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const saleId = params.get("sale");
  const filtered = state.purchases.filter(
    (p) =>
      (!saleId || p.saleId === saleId) &&
      (status === "All" || p.status === status) &&
      `${p.number} ${p.vendor}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <TitleHeader
        title="Purchase orders"
        count={state.purchases.length}
        subtitle="Request vendor prices, confirm purchases and receive products."
        actions={
          <Link className="btn primary" to="/purchases/new">
            <Icon name="plus" />
            New RFQ
          </Link>
        }
      />
      <div className="summary-strip three">
        <div>
          <span>Requests for quotation</span>
          <strong>
            {
              state.purchases.filter((p) =>
                ["RFQ", "RFQ Sent"].includes(p.status),
              ).length
            }
          </strong>
          <small>Vendor prices to review</small>
        </div>
        <div>
          <span>Awaiting receipt</span>
          <strong>
            {
              state.purchases.filter((p) => p.status === "Purchase Order")
                .length
            }
          </strong>
          <small>Confirmed purchase orders</small>
        </div>
        <div>
          <span>Purchase value</span>
          <strong>
            {money(
              state.purchases
                .filter((p) =>
                  ["Purchase Order", "Received"].includes(p.status),
                )
                .reduce(
                  (sum, p) => sum + totals(p.lines, 0, p.taxRate).total,
                  0,
                ),
            )}
          </strong>
          <small>Confirmed & received</small>
        </div>
      </div>
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search purchase orders or vendors…"
        />
        <select
          aria-label="Purchase status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          {[
            "All",
            "RFQ",
            "RFQ Sent",
            "Purchase Order",
            "Received",
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
          <Link to="/purchases">Clear filter</Link>
        </div>
      )}
      <div className="table-scroll list-table">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Vendor</th>
              <th>Source document</th>
              <th>Order date</th>
              <th>Expected arrival</th>
              <th className="numeric">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 12, page * 12 + 12).map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="record-link mono" to={`/purchases/${p.id}`}>
                    {p.number}
                  </Link>
                </td>
                <td>{p.vendor}</td>
                <td>
                  {p.saleId ? (
                    <Link className="text-link" to={`/quotations/${p.saleId}`}>
                      {state.sales.find((s) => s.id === p.saleId)?.number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{p.date}</td>
                <td>{p.expectedDate}</td>
                <td className="numeric amount">
                  {money(totals(p.lines, 0, p.taxRate).total)}
                </td>
                <td>
                  <Badge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <Empty
            title="A clearer path from vendor to delivery"
            description="Create an RFQ here or from a confirmed sales order."
            action={
              <Link className="btn secondary" to="/purchases/new">
                Create your first RFQ <Icon name="arrow" />
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
export function PurchaseRoute({ edit = false }: { edit?: boolean }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state } = useWorkspace();
  const p = state.purchases.find((p) => p.id === id);
  if (id === "new") {
    try {
      const draft = newPurchase(state, params.get("sale") || undefined);
      return (
        <PurchaseForm key={params.get("sale") || "new"} initial={draft} isNew />
      );
    } catch (e) {
      return (
        <Empty
          title="Cannot create RFQ"
          description={(e as Error).message}
          action={<Link to="/purchases">View purchases</Link>}
        />
      );
    }
  }
  if (!p)
    return (
      <Empty
        title="Purchase not found"
        description="Choose a purchase from the list."
        action={<Link to="/purchases">Back to purchases</Link>}
      />
    );
  if (edit)
    return p.status === "RFQ" ? (
      <PurchaseForm key={p.id} initial={p} />
    ) : (
      <Empty
        title="This purchase is locked"
        description="Only RFQs can be edited."
        action={<Link to={`/purchases/${p.id}`}>Open purchase</Link>}
      />
    );
  return <PurchaseDetail key={p.id} purchase={p} />;
}
function PurchaseForm({
  initial,
  isNew = false,
}: {
  initial: Purchase;
  isNew?: boolean;
}) {
  const { state, transact } = useWorkspace();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const update = (patch: Partial<Purchase>) =>
    setDraft((p) => ({ ...p, ...patch }));
  const sale = state.sales.find((s) => s.id === draft.saleId);
  return (
    <>
      <PageHeader
        title={isNew ? "New request for quotation" : draft.number}
        crumbs={[{ label: "Purchase orders", to: "/purchases" }]}
        actions={
          <>
            <Button
              variant="primary"
              icon="check"
              onClick={() => {
                if (transact((s) => savePurchase(s, draft), "RFQ saved"))
                  navigate(`/purchases/${draft.id}`);
              }}
            >
              Save
            </Button>
            <Link
              className="btn ghost"
              to={isNew ? "/purchases" : `/purchases/${draft.id}`}
            >
              Discard
            </Link>
          </>
        }
      />
      <StatusBar
        stages={["RFQ", "RFQ Sent", "Purchase Order", "Received"]}
        current="RFQ"
      />
      <div className="record-sheet">
        <div className="record-heading">
          <span className="eyebrow">Request for quotation</span>
          <input
            aria-label="Purchase reference"
            className="record-number-input"
            value={draft.number}
            onChange={(e) => update({ number: e.target.value })}
          />
          {sale && (
            <p>
              Source:{" "}
              <Link className="text-link" to={`/quotations/${sale.id}`}>
                {sale.number} · {sale.customer}
              </Link>
            </p>
          )}
        </div>
        <div className="form-grid">
          <Field label="Vendor" required>
            <input
              value={draft.vendor}
              onChange={(e) => update({ vendor: e.target.value })}
              placeholder="Vendor company name"
            />
          </Field>
          <Field label="Vendor email">
            <input
              type="email"
              value={draft.vendorEmail}
              onChange={(e) => update({ vendorEmail: e.target.value })}
            />
          </Field>
          <Field label="Order date">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </Field>
          <Field label="Expected arrival">
            <input
              type="date"
              value={draft.expectedDate}
              onChange={(e) => update({ expectedDate: e.target.value })}
            />
          </Field>
        </div>
        <div className="static-tab">Products</div>
        {sale && (
          <div className="line-toolbar">
            <span>
              Quantities copied from {sale.number}. Enter the vendor's unit
              costs.
            </span>
          </div>
        )}
        <Lines
          lines={draft.lines}
          onChange={(lines) => update({ lines })}
          products={state.products}
          purchase
        />
        <div className="document-bottom">
          <Field label="Notes & terms">
            <textarea
              rows={4}
              value={draft.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </Field>
          <Totals
            lines={draft.lines}
            taxRate={draft.taxRate}
            onTax={(taxRate) => update({ taxRate })}
          />
        </div>
      </div>
    </>
  );
}
function PurchaseDetail({ purchase: p }: { purchase: Purchase }) {
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
        crumbs={[{ label: "Purchase orders", to: "/purchases" }]}
        actions={<PdfButton document={p} kind="purchase" />}
      />
      <StatusBar
        stages={["RFQ", "RFQ Sent", "Purchase Order", "Received"]}
        current={p.status}
        actions={
          <>
            {p.status === "RFQ" && (
              <Link className="btn secondary" to={`/purchases/${p.id}/edit`}>
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
              <Link to={`/quotations/${sale.id}`}>
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
