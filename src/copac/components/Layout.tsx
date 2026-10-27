import { Link } from "wouter";
import {
  BarChart3,
  Bell,
  Bike,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Users,
  Utensils,
  Warehouse,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { RolUsuario } from "../types";
import { getCookie, deleteCookie } from "../utils/cookies";
import { authService } from "../services/auth.service";
import { tieneAcceso } from "../config/roles";
import { borrarVistas, guardarVistas, leerVistas } from "../utils/sesion";
import "../styles/layout.css";

const NAV_ITEMS = [
  { path: "/copac/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/copac/ventas", label: "Ventas", icon: ShoppingBag },
  { path: "/copac/cocina", label: "Cocina", icon: Utensils },
  { path: "/copac/despacho", label: "Despacho", icon: Package },
  { path: "/copac/repartidor", label: "Repartidor", icon: Bike },
  { path: "/copac/compras", label: "Compras", icon: ClipboardList },
  { path: "/copac/bodega", label: "Bodega", icon: Warehouse },
  { path: "/copac/reportes", label: "Reportes", icon: BarChart3 },
  { path: "/copac/auditoria", label: "Auditoría", icon: History },
  { path: "/copac/notificaciones", label: "Notificaciones", icon: Bell },
  { path: "/copac/usuarios", label: "Usuarios", icon: Users },
];

interface Props {
  rutaActiva: string;
  children: ReactNode;
}

export const Layout = ({ rutaActiva, children }: Props) => {
  // Vistas permitidas segun el backend. Las sesiones anteriores a este cambio no las tienen guardadas:
  // se piden una vez a /auth/me (mientras tanto el menu se arma por rol).
  const [vistas, setVistas] = useState<string[] | null>(() => leerVistas());
  useEffect(() => {
    if (vistas) return;
    let vigente = true;
    authService
      .me()
      .then((v) => {
        if (!v) return;
        guardarVistas(v);
        if (vigente) setVistas(v);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [vistas]);

  const rolActual = (): RolUsuario | null => {
    try {
      return JSON.parse(getCookie("usuario") ?? "null")?.rol ?? null;
    } catch {
      return null;
    }
  };

  const nombreUsuario = () => {
    try {
      const usuario = JSON.parse(getCookie("usuario") ?? "null");
      return usuario?.usuario ?? "Usuario";
    } catch {
      return "Usuario";
    }
  };

  const cerrarSesion = async () => {
    // Revoca el token en el servidor antes de borrar la sesion local.
    await authService.logout();
    deleteCookie("token");
    deleteCookie("usuario");
    borrarVistas();
    window.location.assign("/copac/login");
  };

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">COPAC</div>
        <nav className="layout__nav">
          {NAV_ITEMS.filter(({ path }) => tieneAcceso(rolActual(), path, vistas)).map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={path === rutaActiva ? "layout__link layout__link--activo" : "layout__link"}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="layout__main">
        <header className="layout__topbar">
          <span className="layout__usuario">{nombreUsuario()}</span>
          <button type="button" className="layout__logout" onClick={cerrarSesion}>
            <LogOut size={18} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </header>
        <main className="layout__content">{children}</main>
      </div>
    </div>
  );
};