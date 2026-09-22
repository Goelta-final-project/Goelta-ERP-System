import { useEffect } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { WorkspaceProvider, useWorkspace } from "./store";
import { SalesList, SaleRoute } from "./sales";
import { CustomerList, CustomerRoute } from "./customers";
import { InvoiceList, InvoiceRoute } from "./invoices";
import { PurchaseList, PurchaseRoute } from "./purchases";
import { Products } from "./products";
import { Empty, Icon } from "./ui";

function Shell() {
  const { state, error, notice, clearNotice } = useWorkspace();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(clearNotice, 4000);
    return () => clearTimeout(timeout);
  }, [notice, clearNotice]);
  const purchase = location.pathname.startsWith("/purchases");
  const invoices = location.pathname.startsWith("/invoices");
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/quotations">
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
            to="/quotations"
            className={
              location.pathname.startsWith("/quotations") ||
              location.pathname === "/orders" ||
              location.pathname === "/to-invoice"
                ? "active"
                : ""
            }
          >
            Orders
          </NavLink>
          <NavLink to="/invoices">Invoicing</NavLink>
          <NavLink to="/customers">Customers</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/purchases">Purchase</NavLink>
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
                ["Requests & purchase orders", "/purchases"],
                ["Products", "/products"],
              ]
            : invoices
              ? [
                  ["Customer invoices", "/invoices"],
                  ["Orders to invoice", "/to-invoice"],
                ]
              : [
                  ["Quotations", "/quotations"],
                  ["Sales orders", "/orders"],
                  ["Orders to invoice", "/to-invoice"],
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
      <main id="main" tabIndex={-1}>
        {error && (
          <div role="alert" className="alert error global-error">
            {error}
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/quotations" replace />} />
          <Route path="/quotations" element={<SalesList />} />
          <Route
            path="/orders"
            element={<SalesList key="orders" mode="orders" />}
          />
          <Route
            path="/to-invoice"
            element={<SalesList key="to-invoice" mode="to-invoice" />}
          />
          <Route path="/quotations/:id" element={<SaleRoute />} />
          <Route path="/quotations/:id/edit" element={<SaleRoute edit />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerRoute />} />
          <Route path="/products" element={<Products />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/:id" element={<InvoiceRoute />} />
          <Route path="/purchases" element={<PurchaseList />} />
          <Route path="/purchases/:id" element={<PurchaseRoute />} />
          <Route path="/purchases/:id/edit" element={<PurchaseRoute edit />} />
          <Route
            path="*"
            element={
              <Empty
                title="Page not found"
                description="Return to your sales workspace."
                action={<Link to="/quotations">View quotations</Link>}
              />
            }
          />
        </Routes>
      </main>
      {notice && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" />
            {notice}
          </span>
          <button aria-label="Dismiss notification" onClick={clearNotice}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <footer className="app-footer">
        <span>
          GOELTA <b> / </b> Sales & operations
        </span>
        <span>Built around your workflow.</span>
      </footer>
    </>
  );
}
export default function App() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}
