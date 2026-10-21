import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { portalService } from "../services/portal.service";
import { sesionCliente } from "../store/sesion";
import { AuthLayout } from "../components/AuthLayout";
import { destinoSeguro } from "../utils/destino";

const CAMPOS_VACIOS = { nombre: "", apellido: "", correo: "", telefono: "", telefono_ref: "", contrasenia: "", confirmar: "" };

export default function Registro() {
  const [, navegar] = useLocation();
  const busqueda = useSearch();
  const [f, setF] = useState(CAMPOS_VACIOS);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cambiar = (campo: keyof typeof f, soloDigitos = false) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [campo]: soloDigitos ? e.target.value.replace(/\D/g, "") : e.target.value }));

  // Mismas reglas que el backend (cliente/auth/registro) para avisar antes de enviar.
  const validar = () => {
    if (f.nombre.trim().length < 2 || f.apellido.trim().length < 2) return "Ingresa tu nombre y apellido (mínimo 2 caracteres).";
    if (!/^\S+@\S+\.\S+$/.test(f.correo.trim())) return "Ingresa un correo electrónico válido.";
    if (f.telefono.length < 7) return "El teléfono debe tener al menos 7 dígitos.";
    if (f.telefono_ref && f.telefono_ref === f.telefono) return "El teléfono de referencia debe ser distinto al principal.";
    if (f.contrasenia.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (f.contrasenia !== f.confirmar) return "Las contraseñas no coinciden.";
    return null;
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const problema = validar();
    setError(problema);
    if (problema) return;
    setCargando(true);
    try {
      const sesion = await portalService.registrar({
        nombre: f.nombre.trim(),
        apellido: f.apellido.trim(),
        correo_electronico: f.correo.trim().toLowerCase(),
        telefono: f.telefono,
        ...(f.telefono_ref ? { telefono_ref: f.telefono_ref } : {}),
        contrasenia: f.contrasenia,
      });
      sesionCliente.iniciar(sesion);
      navegar(destinoSeguro(busqueda, "/menu"));
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
      <p className="p-sub">¿Ya tienes cuenta? <Link href={`/login${busqueda ? `?${busqueda}` : ""}`} className="p-enlace">Iniciar sesión</Link></p>
      <form onSubmit={enviar} noValidate>
        <label>Nombre<input className="p-input" value={f.nombre} onChange={cambiar("nombre")} autoComplete="given-name" /></label>
        <label>Apellido<input className="p-input" value={f.apellido} onChange={cambiar("apellido")} autoComplete="family-name" /></label>
        <label>Correo electrónico<input className="p-input" type="email" value={f.correo} onChange={cambiar("correo")} autoComplete="email" /></label>
        <label>Teléfono<input className="p-input" inputMode="numeric" maxLength={15} value={f.telefono} onChange={cambiar("telefono", true)} autoComplete="tel" /></label>
        <label>Teléfono de referencia (opcional)<input className="p-input" inputMode="numeric" maxLength={15} value={f.telefono_ref} onChange={cambiar("telefono_ref", true)} /></label>
        <label>Contraseña<input className="p-input" type="password" value={f.contrasenia} onChange={cambiar("contrasenia")} autoComplete="new-password" /></label>
        <label>Confirmar contraseña<input className="p-input" type="password" value={f.confirmar} onChange={cambiar("confirmar")} autoComplete="new-password" /></label>
        {error && <p className="p-estado p-estado--error" role="alert">{error}</p>}
        <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "CREANDO…" : "CREAR CUENTA"}</button>
      </form>
      <Link href="/menu" className="p-enlace">Seguir viendo el menú →</Link>
    </AuthLayout>
  );
}
