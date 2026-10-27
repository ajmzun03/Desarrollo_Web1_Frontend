import { useState, type FormEvent } from "react";
import { Link, useSearch } from "wouter";
import { ApiError } from "../../copac/services/http";
import { portalService } from "../services/portal.service";
import { AuthLayout } from "../components/AuthLayout";

// Destino del enlace del correo de recuperacion (PASSWORD_RESET_URL_CLIENTE del backend):
//   /restablecer?token_hash=XXXX&type=recovery
export default function RestablecerCliente() {
  const tokenHash = new URLSearchParams(useSearch()).get("token_hash") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [enlaceInvalido, setEnlaceInvalido] = useState(false);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const nueva = String(datos.get("nueva") ?? "");
    const confirmar = String(datos.get("confirmar") ?? "");
    if (nueva.length < 8 || nueva.length > 50) return setError("La contraseña debe tener entre 8 y 50 caracteres.");
    if (nueva !== confirmar) return setError("Las contraseñas no coinciden.");

    setError(null);
    setCargando(true);
    try {
      await portalService.restablecer(tokenHash, nueva);
      setListo(true);
    } catch (err) {
      // 401: enlace invalido, vencido o ya usado (los enlaces son de un solo uso).
      if (err instanceof ApiError && err.status === 401) setEnlaceInvalido(true);
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout titulo={<>Crea tu <em>nueva contraseña</em></>} texto="Elige una contraseña que no uses en otros sitios.">
      <h2>Nueva contraseña</h2>
      {!tokenHash || enlaceInvalido ? (
        <>
          <p className="p-estado p-estado--error" role="alert">
            {error ?? "El enlace no es válido. Solicita uno nuevo desde el inicio de sesión."}
          </p>
          <Link href="/login" className="p-enlace">Volver a iniciar sesión</Link>
        </>
      ) : listo ? (
        <>
          <p className="p-estado p-estado--ok" role="status">Contraseña actualizada. Ya puedes iniciar sesión.</p>
          <Link href="/login" className="p-btn p-btn--lg p-btn--bloque">INICIAR SESIÓN</Link>
        </>
      ) : (
        <form onSubmit={enviar} noValidate>
          <label>Nueva contraseña<input className="p-input" name="nueva" type="password" autoComplete="new-password" /></label>
          <label>Confirmar contraseña<input className="p-input" name="confirmar" type="password" autoComplete="new-password" /></label>
          {error && <p className="p-estado p-estado--error" role="alert">{error}</p>}
          <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "GUARDANDO…" : "CAMBIAR CONTRASEÑA"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
