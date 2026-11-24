import type { Budget } from "../api";
import { formatMoney } from "../format";
import { IconAlert, IconCheck } from "./Icons";

/** Status always pairs color with an icon and a word, never color alone. */
export function budgetStatus(pct: number) {
  if (pct > 100) return { color: "var(--critical)", label: "Excedido", Icon: IconAlert };
  if (pct >= 80) return { color: "var(--warning)", label: "Cerca del límite", Icon: IconAlert };
  return { color: "var(--good)", label: "En control", Icon: IconCheck };
}

export function BudgetProgress({ budget, actions }: { budget: Budget; actions?: React.ReactNode }) {
  const pct = budget.percent_used;
  const { color, label, Icon } = budgetStatus(pct);
  const over = Number(budget.remaining) < 0;
  return (
    <div className="budget">
      <div className="budget-top">
        <strong>{budget.category_name}</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="status">
            <Icon style={{ color }} /> {label}
          </span>
          {actions}
        </div>
      </div>
      <div
        className="budget-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(pct, 100))}
        aria-label={`${budget.category_name}: ${pct}% usado`}
      >
        <div className="budget-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <div className="budget-meta num">
        <span>
          {formatMoney(budget.spent)} de {formatMoney(budget.amount)} · {pct.toFixed(0)}%
        </span>
        <span>
          {over ? `Excedido por ${formatMoney(-Number(budget.remaining))}` : `Quedan ${formatMoney(budget.remaining)}`}
        </span>
      </div>
    </div>
  );
}
