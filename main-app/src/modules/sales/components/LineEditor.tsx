import { useState } from "react";
import { Button, Field, Icon, Modal } from "../../../shared/ui/index";
import type { CatalogItem, Line } from "../domain/types";
import {
  blankLine,
  lineFromProduct,
  money,
  roundMoney,
} from "../domain/workflow";

export function Lines({
  lines,
  onChange,
  products = [],
  purchase = false,
}: {
  lines: Line[];
  onChange?: (v: Line[]) => void;
  products?: CatalogItem[];
  purchase?: boolean;
}) {
  const [attributes, setAttributes] = useState<string | null>(null);
  const [heading, setHeading] = useState("");
  const [error, setError] = useState("");

  // `onChange` is also the edit-mode flag. Without it the same component is a
  // read-only document table, keeping quotation/PDF-facing values consistent.
  const update = (id: string, patch: Partial<Line>) =>
    onChange?.(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const move = (idx: number, delta: number) => {
    const next = [...lines];
    [next[idx], next[idx + delta]] = [next[idx + delta], next[idx]];
    onChange?.(next);
  };
  const selected = lines.find((l) => l.id === attributes);
  return (
    <>
      <div className="table-scroll">
        <table className={`line-table ${onChange ? "editable" : ""}`}>
          <thead>
            <tr>
              {onChange && <th className="line-order" />}
              <th className="line-description">Product / description</th>
              <th className="numeric">Quantity</th>
              <th>Unit</th>
              <th className="numeric">
                {purchase ? "Unit cost" : "Unit price"}
              </th>
              <th className="numeric">Amount</th>
              {onChange && <th />}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={l.id} className={`line-${l.kind}`}>
                {onChange && (
                  <td className="line-order">
                    <button
                      aria-label={`Move line ${idx + 1} up`}
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                    >
                      <Icon name="up" size={13} />
                    </button>
                    <button
                      aria-label={`Move line ${idx + 1} down`}
                      disabled={idx === lines.length - 1}
                      onClick={() => move(idx, 1)}
                    >
                      <Icon name="down" size={13} />
                    </button>
                  </td>
                )}
                <td colSpan={l.kind === "product" ? 1 : 5}>
                  {l.kind === "product" && onChange && (
                    <select
                      aria-label={`Product for line ${idx + 1}`}
                      value={l.catalogId || ""}
                      onChange={(e) => {
                        const p = products.find((p) => p.id === e.target.value);
                        if (p)
                          update(l.id, {
                            ...lineFromProduct(p),
                            id: l.id,
                            quantity: l.quantity,
                            ...(purchase ? { unitPrice: 0 } : {}),
                          });
                        else update(l.id, { catalogId: undefined });
                      }}
                    >
                      <option value="">Custom product or service</option>
                      {l.catalogId &&
                        !products.some((p) => p.id === l.catalogId) && (
                          <option value={l.catalogId}>
                            {l.catalogId} (unavailable)
                          </option>
                        )}
                      {products.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.id} · {p.description}
                        </option>
                      ))}
                    </select>
                  )}
                  {onChange ? (
                    <textarea
                      rows={1}
                      aria-label={`${l.kind === "product" ? "Description" : l.kind === "section" ? "Section" : "Note"} for line ${idx + 1}`}
                      placeholder={
                        l.kind === "section"
                          ? "Section heading…"
                          : l.kind === "note"
                            ? "Write a note…"
                            : "Product or service description…"
                      }
                      value={l.description}
                      onChange={(e) =>
                        update(l.id, { description: e.target.value })
                      }
                    />
                  ) : (
                    <span className="preserve">{l.description}</span>
                  )}
                  {l.kind === "product" && (
                    <div className="line-meta">
                      {onChange ? (
                        <input
                          aria-label={`Item number for line ${idx + 1}`}
                          placeholder="Item no."
                          value={l.itemNo}
                          onChange={(e) =>
                            update(l.id, { itemNo: e.target.value })
                          }
                        />
                      ) : (
                        l.itemNo && <span>{l.itemNo}</span>
                      )}
                      {Object.entries(l.attributes).map(([k, v]) => (
                        <span key={k}>
                          {k}: {v}
                        </span>
                      ))}
                      {onChange && (
                        <button
                          className="text-link"
                          onClick={() => {
                            setAttributes(l.id);
                            setError("");
                          }}
                        >
                          Attributes
                          {Object.keys(l.attributes).length
                            ? ` (${Object.keys(l.attributes).length})`
                            : ""}
                        </button>
                      )}
                    </div>
                  )}
                </td>
                {l.kind === "product" && (
                  <>
                    <td className="numeric">
                      {onChange ? (
                        <input
                          aria-label={`Quantity for line ${idx + 1}`}
                          type="number"
                          min="0.001"
                          step="any"
                          value={Number.isNaN(l.quantity) ? "" : l.quantity}
                          onChange={(e) =>
                            update(l.id, { quantity: e.target.valueAsNumber })
                          }
                        />
                      ) : (
                        l.quantity
                      )}
                    </td>
                    <td>
                      {onChange ? (
                        <input
                          aria-label={`Unit for line ${idx + 1}`}
                          value={l.unit}
                          onChange={(e) =>
                            update(l.id, { unit: e.target.value })
                          }
                        />
                      ) : (
                        l.unit
                      )}
                    </td>
                    <td className="numeric">
                      {onChange ? (
                        <input
                          aria-label={`Unit price for line ${idx + 1}`}
                          type="number"
                          min="0"
                          step="any"
                          value={Number.isNaN(l.unitPrice) ? "" : l.unitPrice}
                          onChange={(e) =>
                            update(l.id, { unitPrice: e.target.valueAsNumber })
                          }
                        />
                      ) : (
                        money(l.unitPrice)
                      )}
                    </td>
                    <td className="numeric line-amount">
                      {Number.isFinite(l.quantity * l.unitPrice)
                        ? money(roundMoney(l.quantity * l.unitPrice))
                        : "—"}
                    </td>
                  </>
                )}
                {onChange && (
                  <td>
                    <button
                      className="icon-button remove-line"
                      aria-label={`Remove line ${idx + 1}`}
                      onClick={() =>
                        onChange(lines.filter((row) => row.id !== l.id))
                      }
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!lines.length && (
          <div className="line-empty">
            Add a product or service to get started.
          </div>
        )}
      </div>
      {onChange && (
        <div className="add-lines">
          <Button
            variant="ghost"
            icon="plus"
            onClick={() => onChange([...lines, blankLine()])}
          >
            Add a product
          </Button>
          <Button
            variant="ghost"
            onClick={() => onChange([...lines, blankLine("section")])}
          >
            Add a section
          </Button>
          <Button
            variant="ghost"
            onClick={() => onChange([...lines, blankLine("note")])}
          >
            Add a note
          </Button>
        </div>
      )}
      {selected && (
        <Modal
          title="Line attributes"
          onClose={() => setAttributes(null)}
          footer={
            <Button variant="primary" onClick={() => setAttributes(null)}>
              Done
            </Button>
          }
        >
          <p className="muted">
            Custom details are included in the quotation and PDF.
          </p>
          {Object.entries(selected.attributes).map(([key, value]) => (
            <div className="attribute-row" key={key}>
              <Field label={key}>
                <input
                  value={value}
                  onChange={(e) =>
                    update(selected.id, {
                      attributes: {
                        ...selected.attributes,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Button
                variant="ghost"
                aria-label={`Remove ${key}`}
                onClick={() =>
                  update(selected.id, {
                    attributes: Object.fromEntries(
                      Object.entries(selected.attributes).filter(
                        ([k]) => k !== key,
                      ),
                    ),
                  })
                }
              >
                <Icon name="trash" />
              </Button>
            </div>
          ))}
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          <div className="attribute-row">
            <Field label="New attribute">
              <input
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Brand, material, warranty…"
              />
            </Field>
            <Button
              onClick={() => {
                const key = heading.trim();
                if (
                  !key ||
                  key.length > 60 ||
                  Object.keys(selected.attributes).some(
                    (k) => k.toLowerCase() === key.toLowerCase(),
                  )
                )
                  return setError("Enter a unique heading of 1–60 characters.");
                update(selected.id, {
                  attributes: { ...selected.attributes, [key]: "" },
                });
                setHeading("");
                setError("");
              }}
            >
              Add
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
