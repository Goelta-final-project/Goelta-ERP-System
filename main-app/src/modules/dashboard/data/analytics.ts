import type { Workspace } from "../../sales/domain/types";
import { invoiceTotal, roundMoney, totals } from "../../sales/domain/workflow";

export type MonthlyActivity = {
  month: string;
  invoiced: number;
  purchases: number;
};

/** Document totals, including tax; purchases are commitments, not accounting COGS. */
export function monthlyActivity(
  workspace: Workspace,
  year: number,
): MonthlyActivity[] {
  const months = Array.from({ length: 12 }, (_, month) => ({
    month: new Intl.DateTimeFormat("en", { month: "short" }).format(
      new Date(year, month, 1),
    ),
    invoiced: 0,
    purchases: 0,
  }));
  for (const invoice of workspace.invoices) {
    if (
      invoice.status !== "Posted" ||
      Number(invoice.date.slice(0, 4)) !== year
    )
      continue;
    const month = months[Number(invoice.date.slice(5, 7)) - 1];
    if (month)
      month.invoiced = roundMoney(month.invoiced + invoiceTotal(invoice));
  }
  for (const purchase of workspace.purchases) {
    if (
      !["Purchase Order", "Received"].includes(purchase.status) ||
      Number(purchase.date.slice(0, 4)) !== year
    )
      continue;
    const month = months[Number(purchase.date.slice(5, 7)) - 1];
    if (month)
      month.purchases = roundMoney(
        month.purchases + totals(purchase.lines, 0, purchase.taxRate).total,
      );
  }
  return months;
}

export function activityYears(
  workspace: Workspace,
  currentYear: number,
): number[] {
  return [
    ...new Set([
      currentYear,
      ...workspace.invoices.map((i) => Number(i.date.slice(0, 4))),
      ...workspace.purchases.map((p) => Number(p.date.slice(0, 4))),
    ]),
  ].sort((a, b) => b - a);
}
