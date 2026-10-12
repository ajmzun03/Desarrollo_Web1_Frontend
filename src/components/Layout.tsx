import { Link } from "wouter";
import { Bell, Flame, LogOut, Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getCookie, deleteCookie } from "../utils/cookies";
import { NAV_GRUPOS, ROL_LABEL } from "../config/navegacion";
import { tieneAcceso } from "../config/roles";
import { notificacionesService } from "../services/notificaciones.service";
import type { RolUsuario } from "../types";
import "../styles/layout.css";

interface Props {
  rutaActiva: string;
  children: ReactNode;
}

interface UsuarioSesion {
  usuario: string;
  rol: RolUsuario | null;
}

const leerUsuario = (): UsuarioSesion => {
  try {
    const u = JSON.parse(getCookie("usuario") ?? "null");
    return { usuario: u?.usuario ?? "Usuario", rol: u?.rol ?? null };
  } catch {
    return { usuario: "Usuario", rol: null };
  }
};

const iniciales = (nombre: string) =>
  nombre
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "U";

export const Layout = ({ rutaActiva, children }: Props) => {
  const { usuario, rol } = leerUsuario();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  const grupos = NAV_GRUPOS.map((g) => ({
    ...g,
    items: g.items.filter((i) => tieneAcceso(rol, i.path)),
  })).filter((g) => g.items.length > 0);

  const actual = NAV_GRUPOS.flatMap((g) => g.items).find((i) => i.path === rutaActiva);

  // Contador de la campana: notificaciones sin leer dirigidas al rol del usuario.
  useEffect(() => {
    let vigente = true;
    notificacionesService
      .getAll()
      .then((todas) => {
        if (vigente) setNoLeidas(todas.filter((n) => !n.leida && (!rol || n.roles_destino.includes(rol))).length);
      })
      .catch(() => {
        // Sin contador si el endpoint falla; la campana sigue funcionando como enlace.
      });
    return () => {
      vigente = false;
    };
  }, [rol, rutaActiva]);

  const cerrarSesion = () => {
    deleteCookie("token");
    deleteCookie("usuario");
    window.location.assign("/copac/login");
  };

  return (
    <div className={menuAbierto ? "layout layout--menu-abierto" : "layout"}>
      <button type="button" className="layout__fondo" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} />

      <aside className="layout__sidebar">
        <div className="layout__brand">
          <span className="layout__brand-logo" aria-hidden="true">
            <Flame size={18} />
          </span>
          <div>
            <p className="layout__brand-nombre">COPAC</p>
            <p className="layout__brand-sub">Sistema empresarial</p>
          </div>
        </div>

        <nav className="layout__nav" aria-label="Principal">
          {grupos.map((g) => (
            <div key={g.grupo} className="layout__grupo">
              <p className="layout__grupo-titulo">{g.grupo}</p>
              {g.items.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setMenuAbierto(false)}
                  className={path === rutaActiva ? "layout__link layout__link--activo" : "layout__link"}
                  aria-current={path === rutaActiva ? "page" : undefined}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="layout__perfil">
          <span className="layout__avatar" aria-hidden="true">{iniciales(usuario)}</span>
          <div className="layout__perfil-datos">
            <p className="layout__perfil-nombre">{usuario}</p>
            <p className="layout__perfil-rol">{rol ? ROL_LABEL[rol] : "Sin rol"}</p>
          </div>
          <button type="button" className="layout__perfil-salir" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="layout__main">
        <header className="layout__topbar">
          <button type="button" className="layout__icono layout__hamburguesa" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="layout__titulos">
            <h1 className="layout__titulo">{actual?.titulo ?? "COPAC"}</h1>
            <p className="layout__subtitulo">COPAC · Sistema Empresarial</p>
          </div>
          <Link
            href="/copac/notificaciones"
            className="layout__icono layout__campana"
            aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
          >
            <Bell size={18} aria-hidden="true" />
            {noLeidas > 0 && <span className="layout__contador">{noLeidas}</span>}
          </Link>
          <span className="layout__avatar layout__avatar--top" title={usuario} aria-hidden="true">{iniciales(usuario)}</span>
        </header>
        <main className="layout__content">{children}</main>
      </div>
    </div>
  );
};
