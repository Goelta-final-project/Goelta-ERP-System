import { Link, NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "../../../shared/ui/ThemeToggle";
import { useWorkspace } from "../data/WorkspaceProvider";

export function SalesNavigation() {
  const { state } = useWorkspace();
  const location = useLocation();
  const purchase = location.pathname.startsWith("/sales/purchases");
  const invoices = location.pathname.startsWith("/sales/invoices");
  const customers = location.pathname.startsWith("/sales/customers");
  const products = location.pathname.startsWith("/sales/products");
  const sectionName = purchase
    ? "Purchase"
    : invoices
      ? "Invoicing"
      : customers
        ? "Customers"
        : products
          ? "Products"
          : "Sales";
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
          <span className="brand-divider" />
        </Link>
        <span className="app-name">{sectionName}</span>
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
          <span className="workspace-name">GOELTA Workspace</span>
          <span className="user-avatar" title="Local workspace">
            G
          </span>
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
