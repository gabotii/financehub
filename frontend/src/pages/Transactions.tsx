import { useState, type FormEvent } from "react";
import { api, ApiError, type Category, type Kind, type Transaction } from "../api";
import { IconChevron, IconDownload, IconEdit, IconPlus, IconTrash } from "../components/Icons";
import { Empty, Field, Modal } from "../components/Modal";
import { formatDate, formatMoney, today } from "../format";
import { useAsync, useDebounced } from "../hooks";

const PAGE_SIZE = 20;

export function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | Kind>("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ordering, setOrdering] = useState("-date");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useDebounced(search);

  const filters = { search: q, kind, category, date_from: dateFrom, date_to: dateTo, ordering };
  const categories = useAsync(() => api.categories(), []);
  const list = useAsync(() => api.transactions({ ...filters, page, page_size: PAGE_SIZE }), [JSON.stringify(filters), page]);

  const reset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  async function remove(t: Transaction) {
    if (!confirm(`¿Eliminar "${t.description}"?`)) return;
    await api.deleteTransaction(t.id);
    if (list.data?.results.length === 1 && page > 1) setPage(page - 1);
    else list.reload();
  }

  async function exportCsv() {
    const blob = await api.exportTransactions(filters);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `movimientos-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const visibleCats = (categories.data ?? []).filter((c) => !kind || c.kind === kind);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Movimientos</h1>
          <p>{data ? `${data.count} en total con los filtros actuales` : " "}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={exportCsv}>
            <IconDownload /> CSV
          </button>
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <IconPlus /> Nuevo movimiento
          </button>
        </div>
      </div>

      {notice && <div className="form-error" style={{ marginBottom: 12 }}>{notice}</div>}

      <section className="card">
        <div className="filters">
          <div className="field grow">
            <label htmlFor="q">Buscar</label>
            <input id="q" className="input" placeholder="Descripción o notas" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="kind">Tipo</label>
            <select id="kind" className="input" value={kind} onChange={(e) => { reset(setKind)(e.target.value as Kind | ""); setCategory(""); }}>
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cat">Categoría</label>
            <select id="cat" className="input" value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
              <option value="">Todas</option>
              {visibleCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="from">Desde</label>
            <input id="from" type="date" className="input" value={dateFrom} onChange={(e) => reset(setDateFrom)(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="to">Hasta</label>
            <input id="to" type="date" className="input" value={dateTo} onChange={(e) => reset(setDateTo)(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ord">Ordenar</label>
            <select id="ord" className="input" value={ordering} onChange={(e) => reset(setOrdering)(e.target.value)}>
              <option value="-date">Más recientes</option>
              <option value="date">Más antiguos</option>
              <option value="-amount">Mayor monto</option>
              <option value="amount">Menor monto</option>
            </select>
          </div>
        </div>

        {list.error && <div className="form-error">{list.error.message}</div>}
        {data && data.results.length === 0 ? (
          <Empty title="No hay movimientos">Prueba con otros filtros o crea uno nuevo.</Empty>
        ) : (
          <div className={`table-wrap ${list.loading && data ? "loading" : ""}`}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th className="hide-sm">Categoría</th>
                  <th className="t-right">Monto</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.results.map((t) => (
                  <tr key={t.id}>
                    <td className="num secondary" style={{ whiteSpace: "nowrap" }}>{formatDate(t.date)}</td>
                    <td>
                      {t.description}
                      {t.notes && <div className="muted" style={{ fontSize: "0.8rem" }}>{t.notes}</div>}
                    </td>
                    <td className="hide-sm">
                      <CategoryPill id={t.category} name={t.category_name} categories={categories.data} />
                    </td>
                    <td className={`t-right num ${t.kind === "income" ? "positive" : ""}`} style={{ whiteSpace: "nowrap", fontWeight: 550 }}>
                      {t.kind === "income" ? "+" : "−"}{formatMoney(t.amount)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost icon-btn" aria-label={`Editar ${t.description}`} onClick={() => setEditing(t)}><IconEdit /></button>
                        <button className="btn btn-ghost icon-btn btn-danger" aria-label={`Eliminar ${t.description}`} onClick={() => remove(t).catch((e) => setNotice(e.message))}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.count > PAGE_SIZE && (
          <div className="pager">
            <span className="num">Página {page} de {pages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><IconChevron dir="left" /> Anterior</button>
              <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente <IconChevron /></button>
            </div>
          </div>
        )}
      </section>

      {editing && (
        <TransactionForm
          initial={editing === "new" ? null : editing}
          categories={categories.data ?? []}
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

function CategoryPill({ id, name, categories }: { id: number; name: string; categories?: Category[] }) {
  const color = categories?.find((c) => c.id === id)?.color ?? "var(--axis)";
  return (
    <span className="pill">
      <i className="swatch" style={{ background: color }} /> {name}
    </span>
  );
}

function TransactionForm({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "expense");
  const [form, setForm] = useState({
    category: initial ? String(initial.category) : "",
    amount: initial?.amount ?? "",
    date: initial?.date ?? today(),
    description: initial?.description ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const options = categories.filter((c) => c.kind === kind);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { ...form, category: Number(form.category) };
    try {
      if (initial) await api.updateTransaction(initial.id, payload);
      else await api.createTransaction(payload);
      onSaved();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Modal title={initial ? "Editar movimiento" : "Nuevo movimiento"} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        {error && !["category", "amount", "date", "description"].some((f) => error.field(f)) && (
          <div className="form-error">{error.message}</div>
        )}
        <div className="segmented" role="group" aria-label="Tipo" style={{ justifySelf: "start" }}>
          <button type="button" aria-pressed={kind === "expense"} onClick={() => { setKind("expense"); setForm({ ...form, category: "" }); }}>Gasto</button>
          <button type="button" aria-pressed={kind === "income"} onClick={() => { setKind("income"); setForm({ ...form, category: "" }); }}>Ingreso</button>
        </div>
        <Field label="Descripción" error={error?.field("description")}>
          <input className="input" required maxLength={255} value={form.description} onChange={set("description")} />
        </Field>
        <div className="form-row">
          <Field label="Monto" error={error?.field("amount")}>
            <input className="input num" type="number" inputMode="decimal" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} />
          </Field>
          <Field label="Fecha" error={error?.field("date")}>
            <input className="input" type="date" required value={form.date} onChange={set("date")} />
          </Field>
        </div>
        <Field label="Categoría" error={error?.field("category")}>
          <select className="input" required value={form.category} onChange={set("category")}>
            <option value="" disabled>Elige una categoría</option>
            {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Notas (opcional)">
          <textarea className="input" value={form.notes} onChange={set("notes")} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}
