import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Field,
  PageHeader,
  StatusBar,
  Tabs,
} from "../../../../shared/ui/index";
import { Lines } from "../../components/LineEditor";
import { Totals } from "../../components/Totals";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Sale } from "../../domain/types";
import {
  newSale,
  productLines,
  profileRecipients,
  saveSale,
  stockWarnings,
} from "../../domain/workflow";
import { RecipientsEditor } from "../customers/index";

export function SaleForm({ initial }: { initial?: Sale }) {
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
      navigate(`/sales/quotations/${draft.id}${email ? "?email=1" : ""}`);
  };
  const importLines = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      const { parseQuotationLines, readWorkbook } =
        await import("../../services/excel");
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
    <div className={`quotation-form-page${initial ? "" : " compact"}`}>
      <PageHeader
        title={initial ? draft.number : "New quotation"}
        crumbs={[{ label: "Quotations", to: "/sales/quotations" }]}
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
              to={
                initial
                  ? `/sales/quotations/${initial.id}`
                  : "/sales/quotations"
              }
            >
              Discard
            </Link>
          </>
        }
      />
      {initial && (
        <StatusBar
          stages={["Quotation", "Quotation Sent", "Sales Order"]}
          current="Quotation"
        />
      )}
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
            <Link className="text-link" to="/sales/customers/new">
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
                      (await import("../../services/excel")).downloadSchema(
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
    </div>
  );
}
