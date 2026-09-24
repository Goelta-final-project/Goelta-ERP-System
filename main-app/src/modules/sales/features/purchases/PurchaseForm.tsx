import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Field,
  PageHeader,
  StatusBar,
} from "../../../../shared/ui/index";
import { Lines } from "../../components/LineEditor";
import { Totals } from "../../components/Totals";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Purchase } from "../../domain/types";
import { savePurchase } from "../../domain/workflow";

export function PurchaseForm({
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
        crumbs={[{ label: "Purchase orders", to: "/sales/purchases" }]}
        actions={
          <>
            <Button
              variant="primary"
              icon="check"
              onClick={() => {
                if (transact((s) => savePurchase(s, draft), "RFQ saved"))
                  navigate(`/sales/purchases/${draft.id}`);
              }}
            >
              Save
            </Button>
            <Link
              className="btn ghost"
              to={isNew ? "/sales/purchases" : `/sales/purchases/${draft.id}`}
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
              <Link className="text-link" to={`/sales/quotations/${sale.id}`}>
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
