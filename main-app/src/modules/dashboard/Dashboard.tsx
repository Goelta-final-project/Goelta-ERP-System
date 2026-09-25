import { Link } from "react-router-dom";
import { Icon } from "../../shared/ui/Icon";
import { useWorkspace } from "../sales/data/WorkspaceProvider";
import { amountDue, money } from "../sales/domain/workflow";
import { ApplicationLauncher } from "./components/ApplicationLauncher";
import { FinancialActivity } from "./components/FinancialActivity";
import { TaskManager } from "./components/TaskManager";
import { WorkspaceHeader } from "./components/WorkspaceHeader";

export function Dashboard() {
  const { state, error } = useWorkspace();
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const quotationCount = state.sales.filter((sale) =>
    ["Draft", "Sent", "Hold"].includes(sale.status),
  ).length;
  const orderCount = state.sales.filter(
    (sale) => sale.status === "Accepted",
  ).length;
  const outstanding = state.invoices
    .filter((invoice) => invoice.status === "Posted")
    .reduce((sum, invoice) => sum + amountDue(invoice), 0);
  const demo = state.sales.some((sale) => sale.isDemo);

  // Dashboard figures are derived from the same workspace used by Sales so
  // launcher metrics never maintain a second copy of business data.
  return (
    <div className="dashboard">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <WorkspaceHeader />
      <div className="dashboard-context">
        <span>
          <Icon name="grid" size={14} /> Workspace overview
        </span>
        <span className="local-indicator">
          <i />
          {demo ? "Includes demo records" : "Local workspace"}
        </span>
      </div>
      <main id="main" className="dashboard-main" tabIndex={-1}>
        {error && (
          <div role="alert" className="alert error global-error">
            {error}
          </div>
        )}
        <section className="welcome-panel" aria-labelledby="welcome-heading">
          <div className="welcome-copy">
            <span className="eyebrow">GOELTA GLOBAL WORKSPACE</span>
            <h1 id="welcome-heading">
              {greeting}. <span>Let’s get to work.</span>
            </h1>
            <p>
              Your people, your operations, your next move.
              <br />
              Everything you need to keep business moving, in one place.
            </p>
            {/* <Link className="btn primary" to="/sales/quotations">
              Open sales workspace <Icon name="arrow" size={16} />
            </Link> */}
          </div>
          <div className="welcome-aside">
            <time dateTime={now.toLocaleDateString("en-CA")}>
              {new Intl.DateTimeFormat("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(now)}
            </time>
            <div className="workspace-emblem" aria-hidden="true">
              <span className="emblem-tile tile-one">
                <Icon name="file" size={27} />
              </span>
              <span className="emblem-tile tile-two">
                <Icon name="box" size={33} />
              </span>
              <span className="emblem-tile tile-three">
                <Icon name="check" size={25} />
              </span>
              <span className="emblem-dot dot-one" />
              <span className="emblem-dot dot-two" />
            </div>
            <span className="welcome-motto">Built around your workflow.</span>
          </div>
        </section>
        <ApplicationLauncher />
        <section className="dashboard-metrics" aria-label="Sales summary">
          <Link to="/sales/quotations">
            <span className="metric-symbol tone-plum">
              <Icon name="file" size={21} />
            </span>
            <div>
              <span>Open quotations</span>
              <strong>
                {quotationCount}
                <small>Draft, sent & on hold</small>
              </strong>
            </div>
            <Icon name="chevron" size={17} />
          </Link>
          <Link to="/sales/orders">
            <span className="metric-symbol tone-teal">
              <Icon name="cart" size={21} />
            </span>
            <div>
              <span>Confirmed orders</span>
              <strong>
                {orderCount}
                <small>Ready for the next step</small>
              </strong>
            </div>
            <Icon name="chevron" size={17} />
          </Link>
          <Link to="/sales/invoices">
            <span className="metric-symbol tone-orange">
              <Icon name="dollar" size={21} />
            </span>
            <div>
              <span>Outstanding invoices</span>
              <strong>
                {money(outstanding)}
                <small>Remaining balance · USD</small>
              </strong>
            </div>
            <Icon name="chevron" size={17} />
          </Link>
        </section>
        <div className="dashboard-widgets">
          <FinancialActivity />
          <TaskManager />
        </div>
        <p className="dashboard-storage-note">
          <Icon name="clock" size={14} /> Records and tasks are saved in this
          browser.{" "}
          {demo
            ? "Sales summaries include sample quotations."
            : "This workspace is not connected to a server."}
        </p>
      </main>
      <footer className="app-footer">
        <span>
          GOELTA <b> / </b> Business workspace
        </span>
        <span>Pioneering beyond excellence.</span>
      </footer>
    </div>
  );
}
