import { useRef, useState } from "react";
import { catalogColumns, validExtraColumns } from "./schema";
import { money } from "./domain";
import type { CatalogItem } from "./model";
import { validProduct } from "./storage";
import { useWorkspace } from "./store";
import {
  Badge,
  Button,
  Empty,
  Field,
  Icon,
  Modal,
  PageHeader,
  Pagination,
  Search,
} from "./ui";

export function Products() {
  const { state, transact } = useWorkspace();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [page, setPage] = useState(0);
  const [schema, setSchema] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const filtered = state.products.filter(
    (p) =>
      (type === "All" || p.type === type) &&
      `${p.id} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const importFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      const { readWorkbook } = await import("./excel");
      const { parseCatalog } = await import("./catalog-import");
      const incoming = parseCatalog(await readWorkbook(f), state.extraColumns);
      transact((s) => {
        for (const product of incoming) {
          const idx = s.products.findIndex(
            (p) => p.id.toLowerCase() === product.id.toLowerCase(),
          );
          if (idx >= 0)
            s.products[idx] = { ...product, id: s.products[idx].id };
          else s.products.push(product);
        }
      }, `${incoming.length} products imported`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  return (
    <>
      <PageHeader
        title="Products & services"
        count={state.products.length}
        subtitle="One catalog for your quotations and purchases."
        actions={
          <>
            <Button icon="settings" onClick={() => setSchema(true)}>
              Excel schema
            </Button>
            <Button
              icon="upload"
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              {busy ? "Importing…" : "Import Excel"}
            </Button>
            <Button
              variant="primary"
              icon="plus"
              onClick={() =>
                setEditing({
                  id: "",
                  itemNo: "",
                  name: "",
                  description: "",
                  category: "",
                  type: "Product",
                  unit: "Item",
                  rate: 0,
                  price: 0,
                  available: 0,
                  attributes: Object.fromEntries(
                    state.extraColumns.map((k) => [k, ""]),
                  ),
                })
              }
            >
              New product
            </Button>
            <input
              hidden
              ref={file}
              type="file"
              aria-label="Import products Excel file"
              accept=".xlsx,.xls"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </>
        }
      />
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search products, codes or categories…"
        />
        <select
          aria-label="Product type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(0);
          }}
        >
          {["All", "Product", "Service"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </div>
      <div className="table-scroll list-table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Reference</th>
              <th>Type</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="numeric">Sales price</th>
              <th className="numeric">On hand</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 12, page * 12 + 12).map((p) => (
              <tr key={p.id}>
                <td>
                  <button
                    className="record-link product-name"
                    onClick={() => setEditing(structuredClone(p))}
                  >
                    <span className="product-icon">
                      <Icon name={p.type === "Service" ? "settings" : "box"} />
                    </span>
                    <span>
                      {p.description}
                      <small>
                        {Object.entries(p.attributes)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </small>
                    </span>
                  </button>
                </td>
                <td className="mono">{p.id}</td>
                <td>
                  <Badge status={p.type} />
                </td>
                <td>{p.category}</td>
                <td>{p.unit}</td>
                <td className="numeric amount">{money(p.rate)}</td>
                <td className="numeric">
                  {p.available === null ? "Unlimited" : p.available}
                </td>
                <td>
                  <button
                    className="row-open"
                    aria-label={`Edit ${p.description}`}
                    onClick={() => setEditing(structuredClone(p))}
                  >
                    <Icon name="chevron" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <Empty
            title="No products found"
            description="Create a product or upload your Excel catalog."
          />
        )}
      </div>
      <p className="list-footnote">
        <Icon name="upload" size={14} /> Excel imports update matching product
        codes and add new products.
      </p>
      {schema && <SchemaDialog onClose={() => setSchema(false)} />}{" "}
      {editing && (
        <ProductDialog initial={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
function ProductDialog({
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
function SchemaDialog({ onClose }: { onClose: () => void }) {
  const { state, transact } = useWorkspace();
  const [extras, setExtras] = useState(state.extraColumns);
  const [newColumn, setNewColumn] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal
      title="Excel schema"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            icon="download"
            onClick={async () => {
              try {
                const { downloadSchema } = await import("./excel");
                if (
                  transact((s) => {
                    s.extraColumns = extras;
                  }, "Excel schema saved")
                ) {
                  downloadSchema(extras);
                  onClose();
                }
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save & download schema
          </Button>
        </>
      }
    >
      <p>
        Use these exact headings in your workbook. Each row is a product or
        service.
      </p>
      <h4>Required columns</h4>
      <div className="schema-chips">
        {Object.values(catalogColumns).map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <h4>Extra columns</h4>
      <p className="muted">
        Extra values are kept on products, quotation lines and PDFs.
      </p>
      <div className="schema-chips">
        {extras.map((h) => (
          <span key={h}>
            {h}
            <button
              aria-label={`Remove column ${h}`}
              onClick={() => setExtras(extras.filter((s) => s !== h))}
            >
              <Icon name="close" size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="attribute-row">
        <Field label="Column heading">
          <input
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            placeholder="Brand, warranty, material…"
          />
        </Field>
        <Button
          onClick={() => {
            const next = [...extras, newColumn.trim()];
            if (
              !validExtraColumns(next) ||
              newColumn.trim().toLowerCase() === "quantity"
            )
              return setError(
                "Use a unique heading of 1–60 characters. Quantity is reserved for quotation imports.",
              );
            setExtras(next);
            setNewColumn("");
            setError("");
          }}
        >
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <small>
        Quotation line templates include an additional Quantity column and can
        be downloaded from the quotation form.
      </small>
    </Modal>
  );
}
