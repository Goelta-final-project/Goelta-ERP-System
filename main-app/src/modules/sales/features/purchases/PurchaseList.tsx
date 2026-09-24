import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Badge,
  Empty,
  Icon,
  PageHeader,
  Pagination,
  Search,
} from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import { money, totals } from "../../domain/workflow";

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
      <PageHeader
        title="Purchase orders"
        count={state.purchases.length}
        subtitle="Request vendor prices, confirm purchases and receive products."
        actions={
          <Link className="btn primary" to="/sales/purchases/new">
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
          <Link to="/sales/purchases">Clear filter</Link>
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
                  <Link
                    className="record-link mono"
                    to={`/sales/purchases/${p.id}`}
                  >
                    {p.number}
                  </Link>
                </td>
                <td>{p.vendor}</td>
                <td>
                  {p.saleId ? (
                    <Link
                      className="text-link"
                      to={`/sales/quotations/${p.saleId}`}
                    >
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
              <Link className="btn secondary" to="/sales/purchases/new">
                Create your first RFQ <Icon name="arrow" />
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
