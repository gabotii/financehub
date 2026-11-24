import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { IconDashboard, IconList, IconLogout, IconMoon, IconSun, IconTag, IconTarget, Logo } from "./Icons";

const links = [
  { to: "/", label: "Resumen", icon: IconDashboard, end: true },
  { to: "/transactions", label: "Movimientos", icon: IconList },
  { to: "/budgets", label: "Presupuestos", icon: IconTarget },
  { to: "/categories", label: "Categorías", icon: IconTag },
];

type Theme = "light" | "dark";
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("fh.theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function Layout() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("fh.theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Principal">
        <div className="brand">
          <Logo /> FinanceHub
        </div>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link" title={label}>
            <Icon /> <span>{label}</span>
          </NavLink>
        ))}
        <div className="sidebar-footer">
          <div className="sidebar-user" title={user?.email}>
            {user?.first_name ? `${user.first_name} · ` : ""}
            {user?.email}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema oscuro"}
              title="Cambiar tema"
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
            <button className="btn btn-sm" onClick={logout}>
              <IconLogout /> <span className="hide-sm">Salir</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
