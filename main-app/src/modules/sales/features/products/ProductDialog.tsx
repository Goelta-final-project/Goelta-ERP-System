import { useState } from "react";
import { Button, Field, Modal } from "../../../../shared/ui/index";
import { validProduct } from "../../data/storage";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { CatalogItem } from "../../domain/types";

export function ProductDialog({
  initial,
  onClose,
}: {
  initial: CatalogItem;
  onClose: () => void;
}) {
  const { state, transact, error: storeError } = useWorkspace();
  const [p, setP] = useState(initial);
  const [error, setError] = useState("");
  const exists = state.products.some((item) => item.id === initial.id);
  const update = (patch: Partial<CatalogItem>) =>
    setP((p) => ({ ...p, ...patch }));
  return (
    <Modal
      title={exists ? "Edit product" : "New product"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Discard</Button>
          <Button
            variant="primary"
            onClick={() => {
              const clean = {
                ...p,
                id: p.id.trim(),
                name: p.description.trim(),
                description: p.description.trim(),
                price: p.rate,
              };
              if (
                !validProduct(clean) ||
                !clean.category.trim() ||
                !clean.itemNo.trim()
              )
                return setError(
                  "Enter a product code, item number, description, category, unit and valid non-negative amounts.",
                );
              if (
                transact((s) => {
                  if (
                    !exists &&
                    s.products.some(
                      (item) =>
                        item.id.toLowerCase() === clean.id.toLowerCase(),
                    )
                  )
                    throw Error("That product code already exists.");
                  s.products = exists
                    ? s.products.map((item) =>
                        item.id === initial.id ? clean : item,
                      )
                    : [...s.products, clean];
                }, "Product saved")
              )
                onClose();
            }}
          >
            Save product
          </Button>
        </>
      }
    >
      <div className="form-grid compact">
        <Field label="Product code" required>
          <input
            disabled={exists}
            value={p.id}
            onChange={(e) => update({ id: e.target.value })}
          />
        </Field>
        <Field label="Item number" required>
          <input
            value={p.itemNo}
            onChange={(e) => update({ itemNo: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Description" required>
        <input
          value={p.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </Field>
      <div className="form-grid compact">
        <Field label="Type">
          <select
            value={p.type}
            onChange={(e) =>
              update({
                type: e.target.value as CatalogItem["type"],
                available: e.target.value === "Service" ? null : 0,
              })
            }
          >
            <option>Product</option>
            <option>Service</option>
          </select>
        </Field>
        <Field label="Category">
          <input
            value={p.category}
            onChange={(e) => update({ category: e.target.value })}
          />
        </Field>
        <Field label="Unit">
          <input
            value={p.unit}
            onChange={(e) => update({ unit: e.target.value })}
          />
        </Field>
        <Field label="Sales price ($)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={Number.isNaN(p.rate) ? "" : p.rate}
            onChange={(e) => update({ rate: e.target.valueAsNumber })}
          />
        </Field>
        {p.type === "Product" && (
          <Field label="On-hand quantity">
            <input
              type="number"
              min="0"
              step="any"
              value={
                p.available === null || Number.isNaN(p.available)
                  ? ""
                  : p.available
              }
              onChange={(e) => update({ available: e.target.valueAsNumber })}
            />
          </Field>
        )}
        {Object.entries(p.attributes).map(([k, v]) => (
          <Field key={k} label={k}>
            <input
              value={v}
              onChange={(e) =>
                update({ attributes: { ...p.attributes, [k]: e.target.value } })
              }
            />
          </Field>
        ))}
      </div>
      {(error || storeError) && (
        <p role="alert" className="alert error">
          {error || storeError}
        </p>
      )}
    </Modal>
  );
}
