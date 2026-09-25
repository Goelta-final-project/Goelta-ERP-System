import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon } from "../../../shared/ui/Icon";
import { ThemeToggle } from "../../../shared/ui/ThemeToggle";
import { useWorkspace } from "../data/WorkspaceProvider";

export function SalesNavigation() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState("");
  const location = useLocation();
  const purchase = location.pathname.startsWith("/sales/purchases");
  const invoices = location.pathname.startsWith("/sales/invoices");
  const customers = location.pathname.startsWith("/sales/customers");
  const products = location.pathname.startsWith("/sales/products");
  const term = query.trim().toLowerCase();
  const searchResults = term
    ? [
        ...state.sales.map((sale) => ({ label: sale.number, detail: `${sale.customer} · ${sale.title}`, to: `/sales/quotations/${sale.id}` })),
        ...state.invoices.map((invoice) => ({ label: invoice.number, detail: invoice.customer, to: `/sales/invoices/${invoice.id}` })),
        ...state.purchases.map((purchase) => ({ label: purchase.number, detail: purchase.vendor, to: `/sales/purchases/${purchase.id}` })),
        ...state.companies.map((company) => ({ label: company.name, detail: "Customer", to: `/sales/customers/${company.id}` })),
        ...state.products.map((product) => ({ label: product.name, detail: product.itemNo, to: "/sales/products" })),
      ]
        .filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(term))
        .slice(0, 6)
    : [];

  const sectionLinks: [string, string][] = purchase
    ? [
        ["Requests & purchase orders", "/sales/purchases"],
        ["Products", "/sales/products"],
      ]
    : invoices
      ? [
          ["Customer invoices", "/sales/invoices"],
          ["Orders to invoice", "/sales/to-invoice"],
        ]
      : customers
        ? [["Customers", "/sales/customers"]]
        : products
          ? [["Products", "/sales/products"]]
          : [
              ["Quotations", "/sales/quotations"],
              ["Sales orders", "/sales/orders"],
              ["Orders to invoice", "/sales/to-invoice"],
            ];
  return (
    <>
      <header className="topbar">
        <Link className="brand" aria-label="GOELTA dashboard" to="/">
          <img className="brand-logo" src="/goelta-logo.png" alt="GOELTA" />
        </Link>
        <span className="module-context" aria-label="Current workspace: Sales">
          Sales
        </span>
        <div className="sales-search" role="search" onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
        }}>
          <Icon name="search" size={15} />
          <input
            aria-label="Search workspace"
            placeholder="Search…"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {term && (
            <div className="sales-search-results">
              {searchResults.length ? searchResults.map((result) => (
                <Link key={`${result.to}-${result.label}`} to={result.to} onClick={() => setQuery("")}>
                  <strong>{result.label}</strong>
                  <span>{result.detail}</span>
                </Link>
              )) : <p>No matching records</p>}
            </div>
          )}
        </div>
        <nav aria-label="Main navigation">
          <NavLink
            to="/sales/quotations"
            className={
              location.pathname.startsWith("/sales/quotations") ||
              location.pathname === "/sales/orders" ||
              location.pathname === "/sales/to-invoice"
                ? "active"
                : ""
            }
          >
            Orders
          </NavLink>
          <span
            className="disabled-nav-item"
            aria-disabled="true"
            title="Invoicing is not available yet"
          >
            Invoicing
          </span>
          <NavLink to="/sales/customers">Customers</NavLink>
          <NavLink to="/sales/products">Products</NavLink>
          <span
            className="disabled-nav-item"
            aria-disabled="true"
            title="Purchase is not available yet"
          >
            Purchase
          </span>
        </nav>
        <div className="topbar-right">
          <ThemeToggle />
          <button type="button" className="account-settings" title="Settings" aria-label="Settings">
            <Icon name="gear" size={21} strokeWidth={2} />
          </button>
          <div className="workspace-profile">
            <span className="user-avatar" aria-hidden="true">G</span>
            <div>
              <strong>GOELTA Global</strong>
              <span>Local workspace</span>
            </div>
          </div>
        </div>
      </header>
      <div className="subnav">
        <Link className="back-link" to="/" aria-label="Back to dashboard">
          <span aria-hidden="true">←</span>
          Dashboard
        </Link>
        <nav aria-label="Sales navigation">
          {sectionLinks.map(([label, to]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="local-indicator">
          <i />
          {state.sales.length && state.sales.every((s) => s.isDemo)
            ? "Demo workspace"
            : "Local workspace"}
        </span>
      </div>
    </>
  );
}
