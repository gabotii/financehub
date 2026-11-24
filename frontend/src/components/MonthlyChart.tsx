import { useEffect, useMemo, useRef, useState } from "react";
import type { MonthRow } from "../api";
import { formatCompact, formatMoney, formatMonth } from "../format";

const H = 250;
const M = { top: 22, right: 8, bottom: 28, left: 56 };
const PH = H - M.top - M.bottom;

/** Track the container's pixel width so the SVG renders 1:1 and text never scales. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceStep(max: number, ticks = 4) {
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

/** Bar with 4px rounded top corners, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const SERIES = [
  { key: "income" as const, label: "Ingresos", color: "var(--series-income)" },
  { key: "expense" as const, label: "Gastos", color: "var(--series-expense)" },
];

export function MonthlyChart({ rows }: { rows: MonthRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [chartRef, W] = useWidth<HTMLDivElement>(640);
  const PW = W - M.left - M.right;

  const { step, max } = useMemo(() => {
    const peak = Math.max(1, ...rows.flatMap((r) => [Number(r.income), Number(r.expense)]));
    const s = niceStep(peak);
    return { step: s, max: Math.ceil(peak / s) * s };
  }, [rows]);

  const band = PW / Math.max(rows.length, 1);
  const barW = Math.max(3, Math.min(18, (band * 0.62 - 2) / 2));
  const y = (v: number) => M.top + PH - (v / max) * PH;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  // On narrow screens label every other month (counting back from the latest).
  const labelEvery = band < 34 ? 2 : 1;

  return (
    <div>
      <div className="card-head" style={{ marginBottom: 10 }}>
        <div className="legend">
          {SERIES.map((s) => (
            <span key={s.key}>
              <i className="swatch" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Vista">
          <button aria-pressed={!asTable} onClick={() => setAsTable(false)}>Gráfico</button>
          <button aria-pressed={asTable} onClick={() => setAsTable(true)}>Tabla</button>
        </div>
      </div>

      {asTable ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mes</th><th className="t-right">Ingresos</th><th className="t-right">Gastos</th><th className="t-right">Balance</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month}>
                  <td>{formatMonth(r.month)}</td>
                  <td className="t-right num">{formatMoney(r.income)}</td>
                  <td className="t-right num">{formatMoney(r.expense)}</td>
                  <td className={`t-right num ${Number(r.balance) >= 0 ? "positive" : ""}`}>{formatMoney(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart" ref={chartRef} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Ingresos y gastos por mes">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num">{formatCompact(t)}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = M.left + band * i + band / 2;
              const active = hover === i;
              return (
                <g key={r.month} opacity={hover === null || active ? 1 : 0.45}>
                  {active && <rect x={cx - band / 2 + 2} y={M.top} width={band - 4} height={PH} rx={6} fill="var(--surface-2)" />}
                  {SERIES.map((s, si) => {
                    const v = Number(r[s.key]);
                    const x = si === 0 ? cx - barW - 1 : cx + 1; // 2px gap between the pair
                    return <path key={s.key} d={barPath(x, y(v), barW, y(0) - y(v))} fill={s.color} />;
                  })}
                  {(active || (rows.length - 1 - i) % labelEvery === 0) && (
                    <text x={cx} y={H - 8} textAnchor="middle" style={active ? { fill: "var(--text)" } : undefined}>
                      {formatMonth(r.month, true)}
                    </text>
                  )}
                  {/* Full-height hit target, larger than the marks. */}
                  <rect
                    x={cx - band / 2}
                    y={M.top}
                    width={band}
                    height={PH + M.bottom}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${formatMonth(r.month)}: ingresos ${formatMoney(r.income)}, gastos ${formatMoney(r.expense)}`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          {hover !== null && rows[hover] && (
            <div
              className="tooltip"
              style={{
                left: `${((M.left + band * hover + band / 2) / W) * 100}%`,
                top: `${(y(Math.max(Number(rows[hover].income), Number(rows[hover].expense))) / H) * 100}%`,
              }}
            >
              <div className="tooltip-title">{formatMonth(rows[hover].month)}</div>
              {SERIES.map((s) => (
                <div className="tooltip-row" key={s.key}>
                  <span><i className="swatch" style={{ background: s.color }} />{s.label}</span>
                  <span className="num">{formatMoney(rows[hover][s.key])}</span>
                </div>
              ))}
              <div className="tooltip-row" style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
                <span>Balance</span>
                <strong className="num">{formatMoney(rows[hover].balance)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
