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
import {
  amountDue,
  dateAfter,
  invoiceLabel,
  invoiceTotal,
  money,
  paidAmount,
} from "../../domain/workflow";

export function InvoiceList() {
  const { state } = useWorkspace();
  const [params] = useSearchParams();
  const saleId = params.get("sale");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const filtered = state.invoices.filter(
    (i) =>
      (!saleId || i.saleId === saleId) &&
      (status === "All" || invoiceLabel(i) === status) &&
      `${i.number} ${i.customer} ${state.sales.find((s) => s.id === i.saleId)?.number}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Customer invoices"
        count={state.invoices.length}
        subtitle="Review, post and record payments against your sales invoices."
        actions={
          <Link className="btn primary" to="/sales/to-invoice">
            <Icon name="plus" />
            Invoice a sales order
          </Link>
        }
      />
      <div className="summary-strip three">
        <div>
          <span>Draft invoices</span>
          <strong>
            {state.invoices.filter((i) => i.status === "Draft").length}
          </strong>
          <small>Ready for review</small>
        </div>
        <div>
          <span>Amount outstanding</span>
          <strong>
            {money(
              state.invoices
                .filter((i) => i.status === "Posted")
                .reduce((sum, i) => sum + amountDue(i), 0),
            )}
          </strong>
          <small>Posted invoices</small>
        </div>
        <div>
          <span>Payments recorded</span>
          <strong>
            {money(state.invoices.reduce((sum, i) => sum + paidAmount(i), 0))}
          </strong>
          <small>
            <i className="dot green" />
            Customer payments
          </small>
        </div>
      </div>
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search invoices or customers…"
        />
        <select
          aria-label="Invoice status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          {[
            "All",
            "Draft",
            "Posted",
            "Partially paid",
            "Paid",
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
          <Link to="/sales/invoices">Clear filter</Link>
        </div>
      )}
      <div className="table-scroll list-table">
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Invoice date</th>
              <th>Due date</th>
              <th className="numeric">Total</th>
              <th className="numeric">Amount due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 12, page * 12 + 12).map((i) => (
              <tr key={i.id}>
                <td>
                  <Link
                    className="record-link mono"
                    to={`/sales/invoices/${i.id}`}
                  >
                    {i.number}
                  </Link>
                  <small className="table-subtitle">
                    {i.kind === "downpayment"
                      ? "Down payment"
                      : "Regular invoice"}
                  </small>
                </td>
                <td>{i.customer}</td>
                <td>
                  <Link
                    className="text-link"
                    to={`/sales/quotations/${i.saleId}`}
                  >
                    {state.sales.find((s) => s.id === i.saleId)?.number}
                  </Link>
                </td>
                <td>{i.date}</td>
                <td
                  className={
                    i.status === "Posted" &&
                    amountDue(i) > 0 &&
                    i.dueDate < dateAfter()
                      ? "overdue"
                      : ""
                  }
                >
                  {i.dueDate}
                </td>
                <td className="numeric amount">{money(invoiceTotal(i))}</td>
                <td className="numeric">
                  {i.status === "Cancelled" ? "—" : money(amountDue(i))}
                </td>
                <td>
                  <Badge status={invoiceLabel(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <Empty
            title="Your invoices start with a sales order"
            description="Confirm a quotation, then create a draft invoice from the order."
            action={
              <Link className="btn secondary" to="/sales/to-invoice">
                View orders to invoice <Icon name="arrow" />
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
