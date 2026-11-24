import { useState, type FormEvent } from "react";
import { api, ApiError, type Category, type Kind } from "../api";
import { IconEdit, IconPlus, IconTrash } from "../components/Icons";
import { Empty, Field, Modal } from "../components/Modal";
import { useAsync } from "../hooks";

const KIND_LABEL: Record<Kind, string> = { income: "Ingresos", expense: "Gastos" };
const SWATCHES = ["#2A78D6", "#EB6834", "#1BAF7A", "#EDA100", "#E87BA4", "#008300", "#6250D6", "#E34948", "#64748B"];

export function CategoriesPage() {
  const list = useAsync(() => api.categories(), []);
  const [editing, setEditing] = useState<Category | Kind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function remove(c: Category) {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    setNotice(null);
    try {
      await api.deleteCategory(c.id);
      list.reload();
    } catch (e) {
      setNotice(
        e instanceof ApiError && e.status === 409
          ? `"${c.name}" tiene movimientos. Reasígnalos o elimínalos antes de borrarla.`
          : (e as Error).message,
      );
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Categorías</h1>
          <p>Organiza tus ingresos y gastos</p>
        </div>
      </div>
      {notice && <div className="form-error" style={{ marginBottom: 16 }} role="alert">{notice}</div>}

      <div className="grid grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {(["expense", "income"] as Kind[]).map((kind) => {
          const items = (list.data ?? []).filter((c) => c.kind === kind);
          return (
            <section className="card" key={kind}>
              <div className="card-head">
                <h2>{KIND_LABEL[kind]}</h2>
                <button className="btn btn-sm" onClick={() => setEditing(kind)}><IconPlus /> Agregar</button>
              </div>
              {list.data && items.length === 0 && <Empty title="Sin categorías" />}
              <div className="table-wrap">
                <table>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                            <i className="swatch" style={{ background: c.color, width: 12, height: 12, borderRadius: "50%" }} />
                            {c.name}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost icon-btn" aria-label={`Editar ${c.name}`} onClick={() => setEditing(c)}><IconEdit /></button>
                            <button className="btn btn-ghost icon-btn btn-danger" aria-label={`Eliminar ${c.name}`} onClick={() => remove(c)}><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <CategoryForm
          initial={typeof editing === "string" ? null : editing}
          kind={typeof editing === "string" ? editing : editing.kind}
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

function CategoryForm({ initial, kind, onClose, onSaved }: { initial: Category | null; kind: Kind; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? SWATCHES[0]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (initial) await api.updateCategory(initial.id, { name, color });
      else await api.createCategory({ name, color, kind });
      onSaved();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? "Editar categoría" : `Nueva categoría de ${KIND_LABEL[kind].toLowerCase()}`} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        {error && !error.field("name") && <div className="form-error">{error.message}</div>}
        <Field label="Nombre" error={error?.field("name")}>
          <input className="input" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="field">
          <span style={{ fontSize: "0.85rem", fontWeight: 550, color: "var(--text-2)" }}>Color</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Color ${s}`}
                aria-pressed={color.toUpperCase() === s}
                onClick={() => setColor(s)}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: s, cursor: "pointer",
                  border: "2px solid var(--surface)",
                  boxShadow: color.toUpperCase() === s ? `0 0 0 2px ${s}` : "none",
                }}
              />
            ))}
            <input type="color" aria-label="Color personalizado" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} style={{ width: 34, height: 30, border: 0, background: "none", padding: 0 }} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}
