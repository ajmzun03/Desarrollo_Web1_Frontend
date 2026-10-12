import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { portalService } from "../services/portal.service";
import { sesionCliente } from "../store/sesion";
import { AuthLayout } from "../components/AuthLayout";

export default function ClienteLogin() {
  const [, navegar] = useLocation();
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(telefono)) return setError("Ingresa tu teléfono de 8 dígitos.");
    setCargando(true);
    setError(null);
    try {
      sesionCliente.iniciar(await portalService.identificar(telefono));
      navegar("/mis-pedidos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setCargando(false);
    }
  };

  return (
    <AuthLayout titulo={<>Bienvenido <em>de vuelta</em></>} texto="Identifícate para ver tus pedidos y hacer un checkout más rápido.">
      <h2>Iniciar sesión</h2>
      <p className="p-sub">¿No tienes cuenta? <Link href="/registro" className="p-enlace">Crear cuenta</Link></p>
      <form onSubmit={enviar} noValidate>
        <label>Teléfono<input className="p-input" inputMode="numeric" maxLength={8} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} autoComplete="tel" /></label>
        {error && <p className="p-estado p-estado--error" role="alert">{error}</p>}
        <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "ENTRANDO…" : "INICIAR SESIÓN"}</button>
      </form>
      <Link href="/menu" className="p-enlace">Continuar como invitado →</Link>
    </AuthLayout>
  );
}
