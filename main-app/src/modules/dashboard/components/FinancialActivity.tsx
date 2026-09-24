import { useId, useState } from "react";
import { useWorkspace } from "../../sales/data/WorkspaceProvider";
import { money } from "../../sales/domain/workflow";
import { activityYears, monthlyActivity } from "../data/analytics";

const compactMoney = new Intl.NumberFormat("en-US", {
  notation: "compact",
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1,
});
const chart = {
  left: 58,
  right: 688,
  top: 20,
  bottom: 184,
  width: 710,
  height: 226,
};

export function FinancialActivity() {
  const { state } = useWorkspace();
  const [year, setYear] = useState(new Date().getFullYear());
  const titleId = useId();
  const months = monthlyActivity(state, year);
  const maximum = Math.max(
    100,
    ...months.flatMap((month) => [month.invoiced, month.purchases]),
  );
  const ceiling = Math.ceil(maximum / 100) * 100;
  const x = (index: number) =>
    chart.left + (index * (chart.right - chart.left)) / 11;
  const y = (value: number) =>
    chart.bottom - (value / ceiling) * (chart.bottom - chart.top);
  const points = (key: "invoiced" | "purchases") =>
    months.map((month, index) => `${x(index)},${y(month[key])}`).join(" ");
  const hasData = months.some((month) => month.invoiced || month.purchases);

  return (
    <section
      className="dashboard-panel financial-panel"
      aria-labelledby="financial-heading"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Business overview</span>
          <h2 id="financial-heading">Financial activity</h2>
          <p>Monthly document totals · USD, including tax</p>
        </div>
        <select
          aria-label="Financial activity year"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {activityYears(state, new Date().getFullYear()).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="chart-legend">
        <span>
          <i className="invoice-dot" />
          Posted invoices
        </span>
        <span>
          <i className="purchase-dot" />
          Confirmed purchases
        </span>
      </div>
      <div className="financial-chart">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-labelledby={titleId}
        >
          <title
            id={titleId}
          >{`Monthly posted invoices and confirmed purchases for ${year}. ${hasData ? "Exact values are available in the table below." : "No posted invoices or confirmed purchases this year."}`}</title>
          {[0, 1, 2, 3, 4].map((step) => {
            const value = (ceiling * step) / 4;
            return (
              <g key={step}>
                <line
                  x1={chart.left}
                  x2={chart.right}
                  y1={y(value)}
                  y2={y(value)}
                  className="chart-gridline"
                />
                <text x={chart.left - 12} y={y(value) + 4} textAnchor="end">
                  {compactMoney.format(value)}
                </text>
              </g>
            );
          })}
          {hasData && (
            <>
              <polygon
                points={`${chart.left},${chart.bottom} ${points("invoiced")} ${chart.right},${chart.bottom}`}
                className="chart-area"
              />
              <polyline
                points={points("invoiced")}
                className="chart-invoiced"
              />
              <polyline
                points={points("purchases")}
                className="chart-purchases"
              />
              {months.map((month, index) => (
                <g key={month.month}>
                  <circle
                    cx={x(index)}
                    cy={y(month.invoiced)}
                    r="3"
                    className="invoice-point"
                  >
                    <title>{`${month.month}: posted invoices ${money(month.invoiced)}`}</title>
                  </circle>
                  <circle
                    cx={x(index)}
                    cy={y(month.purchases)}
                    r="3"
                    className="purchase-point"
                  >
                    <title>{`${month.month}: confirmed purchases ${money(month.purchases)}`}</title>
                  </circle>
                </g>
              ))}
            </>
          )}
          {months.map((month, index) => (
            <text
              key={month.month}
              x={x(index)}
              y={chart.bottom + 27}
              textAnchor="middle"
            >
              {month.month}
            </text>
          ))}
        </svg>
        {!hasData && (
          <div className="chart-empty">
            <strong>Your financial picture starts here.</strong>
            <span>Post an invoice or confirm a purchase to see activity.</span>
          </div>
        )}
      </div>
      <details className="financial-data">
        <summary>View monthly figures</summary>
        <div className="financial-table-scroll">
          <table>
            <caption>Document totals for {year}, USD including tax</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Posted invoices</th>
                <th scope="col">Confirmed purchases</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr key={month.month}>
                  <th scope="row">{month.month}</th>
                  <td>{money(month.invoiced)}</td>
                  <td>{money(month.purchases)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="panel-footnote">
        Purchase commitments are not cost of revenue. Drafts and cancelled
        documents are excluded.
      </p>
    </section>
  );
}
