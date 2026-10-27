import { useState, type FormEvent } from "react";
import { Link, useSearch } from "wouter";
import { AsideInformation } from "../components/AsideInformation";
import { Input } from "../components/Input";
import { ApiError } from "../services/http";
import { authService } from "../services/auth.service";
import "../styles/login.css";

// Destino del enlace del correo de recuperacion (PASSWORD_RESET_URL_STAFF del backend):
//   /copac/restablecer?token_hash=XXXX&type=recovery
export default function Restablecer() {
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
      await authService.restablecer(tokenHash, nueva);
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
    <div className="login__copac">
      <AsideInformation />
      <section className="login__container">
        <h2>Nueva contraseña</h2>
        {!tokenHash || enlaceInvalido ? (
          <>
            <div className="login__error" role="alert">
              {error ?? "El enlace no es válido. Solicita uno nuevo desde el inicio de sesión."}
            </div>
            <Link href="/copac/login">Volver a iniciar sesión</Link>
          </>
        ) : listo ? (
          <>
            <div className="login__aviso" role="status">
              Contraseña actualizada. Tu autenticador sigue siendo el mismo: al iniciar sesión te pediremos el código.
            </div>
            <Link href="/copac/login">Ir a iniciar sesión</Link>
          </>
        ) : (
          <>
            <p>Elige una contraseña nueva (8 a 50 caracteres).</p>
            <form onSubmit={enviar}>
              <Input label="Nueva contraseña" name="nueva" type="password" placeholder="Mínimo 8 caracteres" />
              <Input label="Confirmar contraseña" name="confirmar" type="password" placeholder="Repite la contraseña" />
              {error && <div className="login__error" role="alert">{error}</div>}
              <button type="submit" disabled={cargando}>{cargando ? "Guardando…" : "Cambiar contraseña"}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
