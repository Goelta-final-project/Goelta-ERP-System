import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, Modal } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Sale } from "../../domain/types";
import { createInvoice, money, totals } from "../../domain/workflow";

export function CreateInvoice({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
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
                navigate(`/sales/invoices/${id}`);
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
