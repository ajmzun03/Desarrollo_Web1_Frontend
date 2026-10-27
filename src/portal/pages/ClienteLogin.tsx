import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { portalService } from "../services/portal.service";
import { sesionCliente } from "../store/sesion";
import { AuthLayout } from "../components/AuthLayout";
import { destinoSeguro } from "../utils/destino";

// Los clientes inician sesion solo con correo y contrasena (sin segundo factor).
// "Olvide mi contrasena" envia un correo; el enlace del correo abre /restablecer.
type Paso = "credenciales" | "recuperar";

const valor = (e: FormEvent<HTMLFormElement>, nombre: string) => String(new FormData(e.currentTarget).get(nombre) ?? "");

export default function ClienteLogin() {
  const [, navegar] = useLocation();
  const busqueda = useSearch();
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const ejecutar = async (accion: () => Promise<void>) => {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setCargando(false);
    }
  };

  const irA = (p: Paso) => {
    setPaso(p);
    setError(null);
    setAviso(null);
  };

  const onCredenciales = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const correo = valor(e, "correo").trim().toLowerCase();
    const contrasenia = valor(e, "contrasenia");
    if (!correo || !contrasenia) return setError("Ingresa tu correo y contraseña.");
    return ejecutar(async () => {
      sesionCliente.iniciar(await portalService.login(correo, contrasenia));
      navegar(destinoSeguro(busqueda, "/mis-pedidos"));
    });
  };

  const onRecuperar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const correo = valor(e, "correo").trim().toLowerCase();
    if (!correo) return setError("Ingresa tu correo electrónico.");
    return ejecutar(async () => {
      await portalService.recuperar(correo);
      setPaso("credenciales");
      setAviso("Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva.");
    });
  };

  const mensajes = (
    <>
      {error && <p className="p-estado p-estado--error" role="alert">{error}</p>}
      {aviso && <p className="p-estado p-estado--ok" role="status">{aviso}</p>}
    </>
  );

  return (
    <AuthLayout titulo={<>Bienvenido <em>de vuelta</em></>} texto="Inicia sesión para ver tus pedidos y hacer un checkout más rápido.">
      {paso === "credenciales" ? (
        <>
          <h2>Iniciar sesión</h2>
          <p className="p-sub">¿No tienes cuenta? <Link href={`/registro${busqueda ? `?${busqueda}` : ""}`} className="p-enlace">Crear cuenta</Link></p>
          <form onSubmit={onCredenciales} noValidate>
            <label>Correo electrónico<input className="p-input" name="correo" type="email" autoComplete="email" /></label>
            <label>Contraseña<input className="p-input" name="contrasenia" type="password" autoComplete="current-password" /></label>
            {mensajes}
            <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "ENTRANDO…" : "INICIAR SESIÓN"}</button>
          </form>
          <button type="button" className="p-enlace" onClick={() => irA("recuperar")}>¿Olvidaste tu contraseña?</button>
          <Link href="/menu" className="p-enlace">Seguir viendo el menú →</Link>
        </>
      ) : (
        <>
          <h2>Recuperar contraseña</h2>
          <p className="p-sub">Te enviaremos un correo con un enlace para crear una contraseña nueva.</p>
          <form onSubmit={onRecuperar} noValidate>
            <label>Correo electrónico<input className="p-input" name="correo" type="email" autoComplete="email" /></label>
            {mensajes}
            <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "ENVIANDO…" : "ENVIAR ENLACE"}</button>
          </form>
          <button type="button" className="p-enlace" onClick={() => irA("credenciales")}>← Volver</button>
        </>
      )}
    </AuthLayout>
  );
}
