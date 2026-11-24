import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { BudgetProgress } from "../components/BudgetProgress";
import { CategoryBars } from "../components/CategoryBars";
import { Empty } from "../components/Modal";
import { MonthlyChart } from "../components/MonthlyChart";
import { useAuth } from "../auth";
import { formatDate, formatMoney, formatPct, isoDate, isoMonth } from "../format";
import { useAsync } from "../hooks";

const PERIODS = {
  month: "Este mes",
  last: "Mes anterior",
  quarter: "Últimos 3 meses",
  year: "Este año",
} as const;
type Period = keyof typeof PERIODS;

function range(p: Period): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case "month":
      return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
    case "last":
      return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
    case "quarter":
      return [isoDate(new Date(y, m - 2, 1)), isoDate(new Date(y, m + 1, 0))];
    case "year":
      return [isoDate(new Date(y, 0, 1)), isoDate(new Date(y, 11, 31))];
  }
}

export function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [from, to] = range(period);

  const summary = useAsync(() => api.summary(from, to), [from, to]);
  const breakdown = useAsync(() => api.byCategory(from, to, "expense"), [from, to]);
  const monthly = useAsync(() => api.monthly(12), []);
  const budgets = useAsync(() => api.budgets(isoMonth(new Date())), []);

  const s = summary.data;
  const balance = s ? Number(s.balance) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hola{user?.first_name ? `, ${user.first_name}` : ""}</h1>
          <p>
            {formatDate(from)} – {formatDate(to)}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Período">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <button key={p} aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {PERIODS[p]}
            </button>
          ))}
        </div>
      </div>

      {summary.error && <div className="form-error" style={{ marginBottom: 16 }}>{summary.error.message}</div>}

      <div className={`grid grid-4 ${summary.loading && s ? "loading" : ""}`} style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="stat-label">
            <i className="swatch" style={{ background: "var(--series-income)" }} /> Ingresos
          </div>
          <div className="stat-value">{s ? formatMoney(s.total_income) : "—"}</div>
        </div>
        <div className="card">
          <div className="stat-label">
            <i className="swatch" style={{ background: "var(--series-expense)" }} /> Gastos
          </div>
          <div className="stat-value">{s ? formatMoney(s.total_expense) : "—"}</div>
        </div>
        <div className="card">
          <div className="stat-label">Balance</div>
          <div className={`stat-value ${balance > 0 ? "positive" : ""}`}>{s ? formatMoney(s.balance) : "—"}</div>
          <div className="stat-sub">{s ? `${s.transaction_count} movimientos` : ""}</div>
        </div>
        <div className="card">
          <div className="stat-label">Tasa de ahorro</div>
          <div className="stat-value">{s?.savings_rate == null ? "—" : formatPct(s.savings_rate)}</div>
          <div className="stat-sub">del ingreso del período</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Ingresos vs. gastos</h2>
              <p>Últimos 12 meses</p>
            </div>
          </div>
          {monthly.data ? <MonthlyChart rows={monthly.data} /> : <div style={{ height: 260 }} />}
        </section>
        <section className={`card ${breakdown.loading && breakdown.data ? "loading" : ""}`}>
          <div className="card-head">
            <div>
              <h2>Gastos por categoría</h2>
              <p>{PERIODS[period]}</p>
            </div>
          </div>
          {breakdown.data && <CategoryBars rows={breakdown.data} />}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Presupuestos de este mes</h2>
            <p>Gasto real contra el límite de cada categoría</p>
          </div>
          <Link to="/budgets" className="btn btn-sm">Gestionar</Link>
        </div>
        {budgets.data?.length === 0 && (
          <Empty title="Aún no tienes presupuestos este mes">
            <Link to="/budgets">Crear el primero</Link>
          </Empty>
        )}
        {budgets.data?.map((b) => <BudgetProgress key={b.id} budget={b} />)}
      </section>
    </>
  );
}
