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
import { dateAfter, invoiceStatus, money, totals } from "../../domain/workflow";

export function SalesList({
  mode = "quotations",
}: {
  mode?: "quotations" | "orders" | "to-invoice";
}) {
  const { state } = useWorkspace();
  const [params] = useSearchParams();
  const customer = params.get("customer");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"date" | "number" | "total">("number");
  const [asc, setAsc] = useState(false);
  const base = state.sales.filter(
    (s) =>
      (!customer || s.customerId === customer) &&
      (mode === "quotations"
        ? true
        : s.status === "Accepted" &&
          (mode !== "to-invoice" || invoiceStatus(state, s) !== "Invoiced")),
  );
  const filtered = base
    .filter(
      (s) =>
        (status === "All" || s.status === status) &&
        [s.number, s.title, s.description, s.customer]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort === "total"
          ? totals(a.lines, a.discount, a.taxRate).total -
            totals(b.lines, b.discount, b.taxRate).total
          : a[sort].localeCompare(b[sort])) * (asc ? 1 : -1),
    );
  const title =
    mode === "orders"
      ? "Sales orders"
      : mode === "to-invoice"
        ? "Orders to invoice"
        : "Quotations";
  const sortBy = (key: typeof sort) => {
    setSort(key);
    setAsc(sort === key ? !asc : true);
  };
  return (
    <>
      <PageHeader
        title={title}
        count={base.length}
        subtitle={
          mode === "quotations"
            ? "From the first conversation to a confirmed order."
            : mode === "orders"
              ? "Confirmed orders, connected to your invoices and purchases."
              : "Create invoices for confirmed customer orders."
        }
        actions={
          <Link className="btn primary" to="/sales/quotations/new">
            <Icon name="plus" />
            New quotation
          </Link>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Quotation pipeline</span>
          <strong>
            {money(
              base
                .filter((s) => ["Draft", "Sent", "Hold"].includes(s.status))
                .reduce(
                  (n, s) => n + totals(s.lines, s.discount, s.taxRate).total,
                  0,
                ),
            )}
          </strong>
          <small>Open opportunities</small>
        </div>
        <div>
          <span>Awaiting a response</span>
          <strong>
            {base.filter((s) => s.status === "Sent").length}
            <small> quotations</small>
          </strong>
          <small>
            <i className="dot blue" />
            Sent to customers
          </small>
        </div>
        <div>
          <span>Confirmed orders</span>
          <strong>
            {base.filter((s) => s.status === "Accepted").length}
            <small> orders</small>
          </strong>
          <small>
            <i className="dot green" />
            Ready for the next step
          </small>
        </div>
        <div>
          <span>To invoice</span>
          <strong>
            {
              base.filter(
                (s) =>
                  s.status === "Accepted" &&
                  invoiceStatus(state, s) !== "Invoiced",
              ).length
            }
            <small> orders</small>
          </strong>
          <Link to="/sales/to-invoice">
            Review orders <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search number, customer or quotation…"
        />
        <div className="filter-select">
          <Icon name="filter" size={16} />
          <select
            aria-label="Quotation status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            {[
              "All",
              "Draft",
              "Sent",
              "Accepted",
              "Hold",
              "Rejected",
              "Cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "All"
                  ? "All statuses"
                  : s === "Accepted"
                    ? "Sales Order"
                    : s}
              </option>
            ))}
          </select>
        </div>
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </div>
      {customer && (
        <div className="filter-banner">
          Customer:{" "}
          {state.companies.find((c) => c.id === customer)?.name || customer}
          <Link to="/sales/quotations">Clear filter</Link>
        </div>
      )}
      <div className="table-scroll list-table">
        <table>
          <thead>
            <tr>
              <th>
                <button onClick={() => sortBy("number")}>
                  Number <Icon name="down" size={12} />
                </button>
              </th>
              <th>Customer / quotation</th>
              <th>
                <button onClick={() => sortBy("date")}>
                  Quotation date <Icon name="down" size={12} />
                </button>
              </th>
              <th>Expiration</th>
              <th className="numeric">
                <button onClick={() => sortBy("total")}>
                  Total <Icon name="down" size={12} />
                </button>
              </th>
              <th>Status</th>
              {mode !== "quotations" && <th>Invoicing</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 12, page * 12 + 12).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link
                    className="record-link mono"
                    to={`/sales/quotations/${s.id}`}
                  >
                    {s.number}
                  </Link>
                </td>
                <td className="customer-quote">
                  <Link to={`/sales/quotations/${s.id}`}>{s.customer}</Link>
                  <span>{s.title || "Untitled quotation"}</span>
                  {s.description && (
                    <small title={s.description}>{s.description}</small>
                  )}
                </td>
                <td>{s.date}</td>
                <td>
                  <span
                    className={
                      s.expiry < dateAfter() &&
                      ["Draft", "Sent"].includes(s.status)
                        ? "overdue"
                        : ""
                    }
                  >
                    {s.expiry}
                  </span>
                </td>
                <td className="numeric amount">
                  {money(totals(s.lines, s.discount, s.taxRate).total)}
                </td>
                <td>
                  <Badge status={s.status} />
                </td>
                {mode !== "quotations" && (
                  <td>
                    <Badge status={invoiceStatus(state, s)} />
                  </td>
                )}
                <td>
                  <Link
                    className="row-open"
                    aria-label={`Open ${s.number}`}
                    to={`/sales/quotations/${s.id}`}
                  >
                    <Icon name="chevron" size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4}>{filtered.length} records</td>
                <td className="numeric">
                  {money(
                    filtered.reduce(
                      (n, s) =>
                        n + totals(s.lines, s.discount, s.taxRate).total,
                      0,
                    ),
                  )}
                </td>
                <td colSpan={mode === "quotations" ? 2 : 3} />
              </tr>
            </tfoot>
          )}
        </table>
        {!filtered.length && (
          <Empty
            title="No quotations found"
            description="Try another search or start a new quotation."
          />
        )}
      </div>
      <p className="list-footnote">
        <Icon name="check" size={14} /> Changes are saved in this browser.
      </p>
    </>
  );
}
