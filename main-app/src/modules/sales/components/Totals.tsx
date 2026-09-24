import type { Line } from "../domain/types";
import { money, totals } from "../domain/workflow";

export function Totals({
  lines,
  discount = 0,
  taxRate = 0,
  deduction = 0,
  deductionTax = 0,
  onDiscount,
  onTax,
}: {
  lines: Line[];
  discount?: number;
  taxRate?: number;
  deduction?: number;
  deductionTax?: number;
  onDiscount?: (n: number) => void;
  onTax?: (n: number) => void;
}) {
  let result;
  try {
    result = totals(lines, discount, taxRate);
  } catch (e) {
    return <div className="alert error">{(e as Error).message}</div>;
  }
  return (
    <div className="totals">
      <div>
        <span>Untaxed amount</span>
        <strong>{money(result.subtotal)}</strong>
      </div>
      <div>
        <span>Discount{onDiscount && " ($)"}</span>
        {onDiscount ? (
          <input
            aria-label="Discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => onDiscount(e.target.valueAsNumber)}
          />
        ) : (
          <strong>{money(discount)}</strong>
        )}
      </div>
      {deduction > 0 && (
        <div>
          <span>Down payments (excl. tax)</span>
          <strong>−{money(deduction - deductionTax)}</strong>
        </div>
      )}
      <div>
        <span>
          Tax{" "}
          {onTax ? (
            <label>
              <input
                aria-label="Tax percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => onTax(e.target.valueAsNumber)}
              />
              %
            </label>
          ) : (
            `(${taxRate}%)`
          )}
        </span>
        <strong>{money(result.tax - deductionTax)}</strong>
      </div>
      <div className="grand-total">
        <span>Total</span>
        <strong>{money(result.total - deduction)}</strong>
      </div>
    </div>
  );
}
