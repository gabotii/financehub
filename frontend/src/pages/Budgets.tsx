import { useState, type FormEvent } from "react";
import { api, ApiError, type Budget, type Category } from "../api";
import { BudgetProgress } from "../components/BudgetProgress";
import { IconChevron, IconEdit, IconPlus, IconTrash } from "../components/Icons";
import { Empty, Field, Modal } from "../components/Modal";
import { formatMoney, formatMonth, isoMonth, shiftMonth } from "../format";
import { useAsync } from "../hooks";

export function BudgetsPage() {
  const [month, setMonth] = useState(isoMonth(new Date()));
  const list = useAsync(() => api.budgets(month), [month]);
  const categories = useAsync(() => api.categories("expense"), []);
  const [editing, setEditing] = useState<Budget | "new" | null>(null);

  const budgets = list.data ?? [];
  const totalLimit = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0);
  const used = new Set(budgets.map((b) => b.category));
  const available = (categories.data ?? []).filter((c) => !used.has(c.id));

  async function remove(b: Budget) {
    if (!confirm(`¿Eliminar el presupuesto de ${b.category_name}?`)) return;
    await api.deleteBudget(b.id);
    list.reload();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Presupuestos</h1>
          <p>
            {budgets.length > 0
              ? `${formatMoney(totalSpent)} gastado de ${formatMoney(totalLimit)} presupuestado`
              : "Define un límite mensual por categoría de gasto"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="segmented" role="group" aria-label="Mes">
            <button aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><IconChevron dir="left" /></button>
            <button aria-pressed="true" style={{ minWidth: 104, textTransform: "capitalize" }}>{formatMonth(month)}</button>
            <button aria-label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}><IconChevron /></button>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing("new")} disabled={!categories.data || available.length === 0}>
            <IconPlus /> Nuevo
          </button>
        </div>
      </div>

      <section className={`card ${list.loading && list.data ? "loading" : ""}`}>
        {list.data && budgets.length === 0 && (
          <Empty title={`Sin presupuestos para ${formatMonth(month)}`}>Crea uno para seguir tu gasto contra un límite.</Empty>
        )}
        {budgets.map((b) => (
          <BudgetProgress
            key={b.id}
            budget={b}
            actions={
              <span style={{ display: "flex" }}>
                <button className="btn btn-ghost icon-btn" aria-label={`Editar ${b.category_name}`} onClick={() => setEditing(b)}><IconEdit /></button>
                <button className="btn btn-ghost icon-btn btn-danger" aria-label={`Eliminar ${b.category_name}`} onClick={() => remove(b)}><IconTrash /></button>
              </span>
            }
          />
        ))}
      </section>

      {editing && (
        <BudgetForm
          initial={editing === "new" ? null : editing}
          month={month}
          categories={editing === "new" ? available : categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

function BudgetForm({ initial, month, categories, onClose, onSaved }: {
  initial: Budget | null;
  month: string;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(initial ? String(initial.category) : String(categories[0]?.id ?? ""));
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (initial) await api.updateBudget(initial.id, { amount });
      else await api.createBudget({ category: Number(category), month, amount });
      onSaved();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? `Presupuesto · ${initial.category_name}` : `Nuevo presupuesto · ${formatMonth(month)}`} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        {error && !error.field("amount") && <div className="form-error">{error.message}</div>}
        {!initial && (
          <Field label="Categoría">
            <select className="input" required value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Límite mensual" error={error?.field("amount")}>
          <input className="input num" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}
