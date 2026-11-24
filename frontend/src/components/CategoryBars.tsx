import type { CategoryTotal } from "../api";
import { formatMoney, formatPct } from "../format";
import { Empty } from "./Modal";

const MAX_ROWS = 6;

/** Ranked horizontal bars. One series, so one fill color; the category's own
 * color appears only as an identity dot next to its name. */
export function CategoryBars({ rows }: { rows: CategoryTotal[] }) {
  if (rows.length === 0) return <Empty title="Sin gastos en este período" />;

  const shown = rows.slice(0, MAX_ROWS);
  const rest = rows.slice(MAX_ROWS);
  if (rest.length) {
    const total = rest.reduce((s, r) => s + Number(r.total), 0);
    shown.push({
      category_id: -1,
      name: `Otras (${rest.length})`,
      color: "var(--axis)",
      total: total.toFixed(2),
      count: rest.reduce((s, r) => s + r.count, 0),
      percentage: Math.round(rest.reduce((s, r) => s + r.percentage, 0) * 10) / 10,
    });
  }
  const peak = Math.max(...shown.map((r) => Number(r.total)));

  return (
    <div className="hbars">
      {shown.map((r) => (
        <div key={r.category_id} title={`${r.count} movimiento${r.count === 1 ? "" : "s"}`}>
          <div className="hbar-label">
            <span>
              <i className="swatch" style={{ background: r.color, borderRadius: "50%" }} />
              <span className="name">{r.name}</span>
            </span>
            <span className="num">
              <strong>{formatMoney(r.total)}</strong> <span className="muted">· {formatPct(r.percentage)}</span>
            </span>
          </div>
          <div className="hbar-track" role="presentation">
            <div className="hbar-fill" style={{ width: `${(Number(r.total) / peak) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
