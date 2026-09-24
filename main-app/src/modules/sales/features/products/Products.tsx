import { useRef, useState } from "react";
import {
  Badge,
  Button,
  Empty,
  Icon,
  PageHeader,
  Pagination,
  Search,
} from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { CatalogItem } from "../../domain/types";
import { money } from "../../domain/workflow";
import { ProductDialog } from "./ProductDialog";
import { SchemaDialog } from "./SchemaDialog";

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
      const { readWorkbook } = await import("../../services/excel");
      const { parseCatalog } = await import("../../services/catalog-import");
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
