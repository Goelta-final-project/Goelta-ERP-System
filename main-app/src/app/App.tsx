import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Dashboard } from "../modules/dashboard/Dashboard";
import { WorkspaceProvider } from "../modules/sales/data/WorkspaceProvider";
import SalesWorkspace from "../modules/sales/SalesWorkspace";
import { Empty } from "../shared/ui/Empty";
import { ErrorBoundary } from "./ErrorBoundary";
import { RouteEffects } from "./RouteEffects";

// Keep bookmarks from the standalone sales app, including filters and fragments.
function LegacySalesRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`/sales${pathname}${search}${hash}`} replace />;
}

const legacyRoutes = [
  "quotations",
  "orders",
  "to-invoice",
  "customers",
  "products",
  "invoices",
  "purchases",
];

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <RouteEffects />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales/*" element={<SalesWorkspace />} />
          {legacyRoutes.map((path) => (
            <Route
              key={path}
              path={`/${path}/*`}
              element={<LegacySalesRedirect />}
            />
          ))}
          <Route
            path="*"
            element={
              <main id="main" tabIndex={-1}>
                <Empty
                  title="Page not found"
                  description="This page is not part of your workspace."
                  action={
                    <Link className="btn primary" to="/">
                      Return to dashboard
                    </Link>
                  }
                />
              </main>
            }
          />
        </Routes>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}
