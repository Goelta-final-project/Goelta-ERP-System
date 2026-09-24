import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Empty,
  Icon,
  PageHeader,
  Pagination,
  Search,
} from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";

export function CustomerList() {
  const { state } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const [view, setView] = useState("cards");
  const filtered = state.companies.filter(
    (c) =>
      (status === "All" || c.status === status) &&
      [
        c.name,
        c.city,
        c.address,
        c.email,
        c.phone,
        ...c.contacts.flatMap((p) => [p.name, p.position, p.email, p.phone]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Customers"
        count={state.companies.length}
        subtitle="The people and companies you do business with."
        actions={
          <Link className="btn primary" to="/sales/customers/new">
            <Icon name="plus" />
            New customer
          </Link>
        }
      />
      <div className="list-toolbar">
        <Search
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(0);
          }}
          placeholder="Search customers, contacts, email or phone…"
        />
        <select
          aria-label="Customer status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          {["All", "Active", "Inactive"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="view-switch">
          <button
            aria-label="Card view"
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            <Icon name="grid" />
          </button>
          <button
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <Icon name="list" />
          </button>
        </div>
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </div>
      {!filtered.length ? (
        <Empty
          title="No customers found"
          description="Try another search or create a new customer."
        />
      ) : view === "cards" ? (
        <div className="customer-grid">
          {filtered.slice(page * 12, page * 12 + 12).map((c, idx) => (
            <Link
              className="customer-card"
              to={`/sales/customers/${c.id}`}
              key={c.id}
            >
              <div className={`company-avatar color-${idx % 4}`}>
                {c.name
                  .split(" ")
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")}
              </div>
              <div className="customer-card-info">
                <h3>{c.name}</h3>
                <p>{c.city || "No city recorded"}</p>
                <p>{c.email || "No email recorded"}</p>
                <p>{c.phone || "No phone recorded"}</p>
                <div className="card-bottom">
                  <span>
                    {c.contacts.length} contacts · {c.profiles.length} profiles
                  </span>
                  <Badge status={c.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="table-scroll list-table">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Contacts / profiles</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 12, page * 12 + 12).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      className="record-link"
                      to={`/sales/customers/${c.id}`}
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.city || "—"}</td>
                  <td>
                    {c.contacts.length} / {c.profiles.length}
                  </td>
                  <td>
                    <Badge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
