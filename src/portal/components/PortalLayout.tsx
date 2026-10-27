import { Link, useLocation } from "wouter";
import { ClipboardList, Home, MapPin, Menu as MenuIcon, ShoppingCart, User, Utensils, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCarrito } from "../store/carrito";
import { portalService } from "../services/portal.service";
import { sesionCliente, useSesionCliente } from "../store/sesion";
import "../styles/portal.css";

const NAV = [
  { path: "/", label: "Inicio", icon: Home },
  { path: "/menu", label: "Menú", icon: Utensils },
  { path: "/sucursales", label: "Sucursales", icon: MapPin },
  { path: "/mis-pedidos", label: "Mis pedidos", icon: ClipboardList },
];

const activo = (ruta: string, path: string) => (path === "/" ? ruta === "/" : ruta.startsWith(path));

export const PortalLayout = ({ children }: { children: ReactNode }) => {
  const [ruta, navegar] = useLocation();
  const [abierto, setAbierto] = useState(false);
  const { cantidadTotal } = useCarrito();
  const cliente = useSesionCliente();

  const salir = async () => {
    await portalService.logout();
    sesionCliente.cerrar();
    setAbierto(false);
    navegar("/");
  };

  return (
    <div className="portal">
      <header className="p-header">
        <div className="p-header__fila">
          <button type="button" className="p-icono p-header__burger" aria-label="Abrir menú" onClick={() => setAbierto(true)}>
            <MenuIcon size={22} />
          </button>
          <Link href="/" className="p-logo">
            <span className="p-logo__marca">C</span>
            <span>COPAC</span>
          </Link>
          <nav className="p-header__nav" aria-label="Principal">
            {NAV.map(({ path, label }) => (
              <Link key={path} href={path} className={activo(ruta, path) ? "p-link p-link--activo" : "p-link"}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="p-header__acciones">
            {cliente ? (
              <button type="button" className="p-btn p-btn--fantasma p-header__sesion" onClick={salir}>
                <User size={16} aria-hidden="true" /> {cliente.cliente.nombre}
              </button>
            ) : (
              <Link href="/login" className="p-btn p-btn--fantasma p-header__sesion">
                Iniciar sesión
              </Link>
            )}
            <Link href="/carrito" className="p-btn p-carrito-btn" aria-label={`Carrito, ${cantidadTotal} productos`}>
              <ShoppingCart size={16} aria-hidden="true" />
              <span className="p-header__carrito-texto">Carrito</span>
              {cantidadTotal > 0 && <span className="p-contador">{cantidadTotal}</span>}
            </Link>
          </div>
        </div>
      </header>

      {abierto && (
        <div className="p-drawer" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button type="button" className="p-drawer__fondo" aria-label="Cerrar menú" onClick={() => setAbierto(false)} />
          <aside className="p-drawer__panel">
            <button type="button" className="p-icono p-drawer__cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}>
              <X size={20} />
            </button>
            {NAV.map(({ path, label, icon: Icon }) => (
              <Link key={path} href={path} className="p-drawer__link" onClick={() => setAbierto(false)}>
                <Icon size={18} aria-hidden="true" /> {label}
              </Link>
            ))}
            {cliente ? (
              <button type="button" className="p-drawer__link" onClick={salir}>
                <User size={18} aria-hidden="true" /> Salir ({cliente.cliente.nombre})
              </button>
            ) : (
              <Link href="/login" className="p-drawer__link" onClick={() => setAbierto(false)}>
                <User size={18} aria-hidden="true" /> Iniciar sesión
              </Link>
            )}
          </aside>
        </div>
      )}

      <main className="p-main">{children}</main>

      <footer className="p-footer">
        <div className="p-footer__fila">
          <span className="p-logo">
            <span className="p-logo__marca">C</span> COPAC
          </span>
          <span>© {new Date().getFullYear()} COPAC — Sistema de Control</span>
        </div>
      </footer>

      <nav className="p-bottom" aria-label="Navegación inferior">
        {NAV.map(({ path, label, icon: Icon }) => (
          <Link key={path} href={path} className={activo(ruta, path) ? "p-bottom__item p-bottom__item--activo" : "p-bottom__item"}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};
