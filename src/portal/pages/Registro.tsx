import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { portalService } from "../services/portal.service";
import { sesionCliente } from "../store/sesion";
import { AuthLayout } from "../components/AuthLayout";

export default function Registro() {
  const [, navegar] = useLocation();
  const [f, setF] = useState({ nombre: "", apellido: "", telefono: "", telefono_ref: "" });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cambiar = (campo: keyof typeof f, numerico = false) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [campo]: numerico ? e.target.value.replace(/\D/g, "") : e.target.value }));

  const validar = () => {
    if (!f.nombre.trim() || !f.apellido.trim()) return "Ingresa tu nombre y apellido.";
    if (!/^\d{8}$/.test(f.telefono) || !/^\d{8}$/.test(f.telefono_ref)) return "Ambos teléfonos deben tener exactamente 8 dígitos.";
    if (f.telefono === f.telefono_ref) return "El teléfono de referencia debe ser distinto al principal.";
    return null;
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const problema = validar();
    setError(problema);
    if (problema) return;
    setCargando(true);
    try {
      sesionCliente.iniciar(await portalService.registrar({ ...f, nombre: f.nombre.trim(), apellido: f.apellido.trim() }));
      navegar("/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      setCargando(false);
    }
  };

  return (
    <AuthLayout rojo titulo={<>Únete a <em>COPAC</em></>} texto="Crea tu cuenta y disfruta de una experiencia de pedido personalizada.">
      <ul className="p-beneficios">
        <li>⚡ <strong>Checkout más rápido</strong> Guarda tus datos</li>
        <li>📦 <strong>Historial de pedidos</strong> Repite tus favoritos</li>
      </ul>
      <h2>Crear cuenta</h2>
      <p className="p-sub">¿Ya tienes cuenta? <Link href="/login" className="p-enlace">Iniciar sesión</Link></p>
      <form onSubmit={enviar} noValidate>
        <label>Nombre<input className="p-input" value={f.nombre} onChange={cambiar("nombre")} autoComplete="given-name" /></label>
        <label>Apellido<input className="p-input" value={f.apellido} onChange={cambiar("apellido")} autoComplete="family-name" /></label>
        <label>Teléfono<input className="p-input" inputMode="numeric" maxLength={8} value={f.telefono} onChange={cambiar("telefono", true)} autoComplete="tel" /></label>
        <label>Teléfono de referencia<input className="p-input" inputMode="numeric" maxLength={8} value={f.telefono_ref} onChange={cambiar("telefono_ref", true)} /></label>
        {error && <p className="p-estado p-estado--error" role="alert">{error}</p>}
        <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "CREANDO…" : "CREAR CUENTA"}</button>
      </form>
      <Link href="/menu" className="p-enlace">Continuar como invitado →</Link>
    </AuthLayout>
  );
}
