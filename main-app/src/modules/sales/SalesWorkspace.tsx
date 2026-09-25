import { useEffect } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Empty, Icon } from "../../shared/ui/index";
import { SalesNavigation } from "./components/SalesNavigation";
import { useWorkspace } from "./data/WorkspaceProvider";
import { CustomerList, CustomerRoute } from "./features/customers/index";
import { InvoiceList, InvoiceRoute } from "./features/invoices/index";
import { Products } from "./features/products/index";
import { PurchaseList, PurchaseRoute } from "./features/purchases/index";
import { SaleRoute, SalesList } from "./features/quotations/index";

// Shared shell for every sales route. Feature folders own their nested screens;
// this component only coordinates navigation, notices, errors, and routing.
export default function SalesWorkspace() {
  const { error, notice, clearNotice } = useWorkspace();
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(clearNotice, 4000);
    return () => clearTimeout(timeout);
  }, [notice, clearNotice]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SalesNavigation />
      <main id="main" tabIndex={-1}>
        {error && (
          <div role="alert" className="alert error global-error">
            {error}
          </div>
        )}
        <Routes>
          <Route index element={<Navigate to="/sales/quotations" replace />} />
          <Route path="quotations" element={<SalesList />} />
          <Route
            path="orders"
            element={<SalesList key="orders" mode="orders" />}
          />
          <Route
            path="to-invoice"
            element={<SalesList key="to-invoice" mode="to-invoice" />}
          />
          <Route path="quotations/:id" element={<SaleRoute />} />
          <Route path="quotations/:id/edit" element={<SaleRoute edit />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerRoute />} />
          <Route path="products" element={<Products />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/:id" element={<InvoiceRoute />} />
          <Route path="purchases" element={<PurchaseList />} />
          <Route path="purchases/:id" element={<PurchaseRoute />} />
          <Route path="purchases/:id/edit" element={<PurchaseRoute edit />} />
          <Route
            path="*"
            element={
              <Empty
                title="Page not found"
                description="Return to your sales workspace."
                action={<Link to="/sales/quotations">View quotations</Link>}
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
