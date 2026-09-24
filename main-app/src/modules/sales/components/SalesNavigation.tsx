import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon } from "../../../shared/ui/Icon";
import { useWorkspace } from "../data/WorkspaceProvider";

export function SalesNavigation() {
  const { state } = useWorkspace();
  const location = useLocation();
  const purchase = location.pathname.startsWith("/sales/purchases");
  const invoices = location.pathname.startsWith("/sales/invoices");
  return (
    <>
      <header className="topbar">
        <Link className="brand" aria-label="GOELTA dashboard" to="/">
          <span className="app-icon">
            <Icon name="grid" size={20} />
          </span>
          GOELTA
          <span className="brand-divider" />
        </Link>
        <span className="app-name">
          {purchase ? "Purchase" : invoices ? "Invoicing" : "Sales"}
        </span>
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
          <NavLink to="/sales/invoices">Invoicing</NavLink>
          <NavLink to="/sales/customers">Customers</NavLink>
          <NavLink to="/sales/products">Products</NavLink>
          <NavLink to="/sales/purchases">Purchase</NavLink>
        </nav>
        <div className="topbar-right">
          <span className="workspace-name">GOELTA Workspace</span>
          <span className="user-avatar" title="Local workspace">
            G
          </span>
        </div>
      </header>
      <div className="subnav">
        <nav aria-label="Sales navigation">
          {(purchase
            ? [
                ["Requests & purchase orders", "/sales/purchases"],
                ["Products", "/sales/products"],
              ]
            : invoices
              ? [
                  ["Customer invoices", "/sales/invoices"],
                  ["Orders to invoice", "/sales/to-invoice"],
                ]
              : [
                  ["Quotations", "/sales/quotations"],
                  ["Sales orders", "/sales/orders"],
                  ["Orders to invoice", "/sales/to-invoice"],
                ]
          ).map(([label, to]) => (
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
