import { useState } from "react";
import { Button, Field, Modal } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Invoice } from "../../domain/types";
import {
  amountDue,
  dateAfter,
  money,
  registerPayment,
} from "../../domain/workflow";

export function PaymentDialog({
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
