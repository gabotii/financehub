import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { Logo } from "../components/Icons";
import { Field } from "../components/Modal";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Email o contraseña incorrectos."
          : err instanceof ApiError && err.status === 429
            ? "Demasiados intentos. Espera un minuto."
            : "No se pudo conectar con el servidor.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="brand"><Logo /> FinanceHub</div>
        <p>Inicia sesión para ver tus finanzas</p>
        <form className="form-grid" onSubmit={submit}>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Field label="Email">
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contraseña">
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        </form>
        <div className="auth-foot">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </div>
        <div className="demo-hint">
          Demo: demo@financehub.dev / demo-pass-123{" "}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setEmail("demo@financehub.dev");
              setPassword("demo-pass-123");
            }}
          >
            Usar
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", email: "", password: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form.email, form.password, form.first_name);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, { detail: "No se pudo conectar con el servidor." }));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const fieldErr = (k: string) => error?.field(k);
  const general = error && !fieldErr("email") && !fieldErr("password") ? error.message : null;

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="brand"><Logo /> FinanceHub</div>
        <p>Crea tu cuenta. Te damos categorías listas para empezar.</p>
        <form className="form-grid" onSubmit={submit}>
          {general && <div className="form-error" role="alert">{general}</div>}
          <Field label="Nombre">
            <input className="input" autoComplete="given-name" value={form.first_name} onChange={set("first_name")} />
          </Field>
          <Field label="Email" error={fieldErr("email")}>
            <input className="input" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Contraseña" error={fieldErr("password") ?? fieldErr("non_field_errors")}>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} />
          </Field>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</button>
        </form>
        <div className="auth-foot">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
