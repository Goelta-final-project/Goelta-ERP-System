import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../shared/ui/Icon";
import { ThemeToggle } from "../../../shared/ui/ThemeToggle";
import { useWorkspace } from "../../sales/data/WorkspaceProvider";
import { applications } from "../data/applications";

export function WorkspaceHeader() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const results = term
    ? [
        ...applications
          .filter((app) => app.href)
          .map((app) => ({
            label: app.name,
            detail: app.description,
            href: app.href!,
          })),
        ...state.sales.map((sale) => ({
          label: sale.number,
          detail: `${sale.customer} · ${sale.title}`,
          href: `/sales/quotations/${sale.id}`,
        })),
        ...state.invoices.map((invoice) => ({
          label: invoice.number,
          detail: invoice.customer,
          href: `/sales/invoices/${invoice.id}`,
        })),
        ...state.purchases.map((purchase) => ({
          label: purchase.number,
          detail: purchase.vendor,
          href: `/sales/purchases/${purchase.id}`,
        })),
        ...state.companies.map((company) => ({
          label: company.name,
          detail: "Customer",
          href: `/sales/customers/${company.id}`,
        })),
      ]
        .filter((item) =>
          `${item.label} ${item.detail}`.toLowerCase().includes(term),
        )
        .slice(0, 8)
    : [];

  return (
    <header className="topbar dashboard-topbar">
      <Link className="brand" to="/" aria-label="GOELTA dashboard">
        <img className="brand-logo" src="/goelta-logo.png" alt="GOELTA" />
      </Link>
      <span className="module-context" aria-label="Current workspace: Overview">
        Overview
      </span>
      <div
        className="workspace-search"
        role="search"
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
        }}
      >
        <Icon name="search" size={17} />
        <input
          aria-label="Search workspace"
          placeholder="Search apps, customers, documents…"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <Icon name="close" size={15} />
          </button>
        )}
        {term && (
          <div className="workspace-search-results">
            <p role="status">
              {results.length
                ? `${results.length} result${results.length === 1 ? "" : "s"}${results.length === 8 ? " · refine your search for more" : ""}`
                : "No matching apps or records"}
            </p>
            <ul>
              {results.map((result) => (
                <li key={result.href}>
                  <Link to={result.href}>
                    <strong>{result.label}</strong>
                    <span>{result.detail}</span>
                    <Icon name="arrow" size={15} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="topbar-right">
        <ThemeToggle />
        <button type="button" className="account-settings" title="Settings" aria-label="Settings">
          <Icon name="gear" size={21} strokeWidth={2} />
        </button>
        <div className="workspace-profile">
          <span className="user-avatar" aria-hidden="true">
            G
          </span>
          <div>
            <strong>GOELTA Global</strong>
            <span>Local workspace</span>
          </div>
        </div>
      </div>
    </header>
  );
}
