import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { portalService } from "../services/portal.service";
import { sesionCliente, type SesionCliente } from "../store/sesion";
import { AuthLayout } from "../components/AuthLayout";
import { destinoSeguro } from "../utils/destino";

type Paso = "credenciales" | "codigo" | "recuperar" | "restablecer";

const valor = (e: FormEvent<HTMLFormElement>, nombre: string) => String(new FormData(e.currentTarget).get(nombre) ?? "");

export default function ClienteLogin() {
  const [, navegar] = useLocation();
  const busqueda = useSearch();
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [correo, setCorreo] = useState("");
  const [tmpToken, setTmpToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = (sesion: SesionCliente) => {
    sesionCliente.iniciar(sesion);
    navegar(destinoSeguro(busqueda, "/mis-pedidos"));
  };

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
    const c = valor(e, "correo").trim().toLowerCase();
    const contrasenia = valor(e, "contrasenia");
    if (!c || !contrasenia) return setError("Ingresa tu correo y contraseña.");
    return ejecutar(async () => {
      const r = await portalService.login(c, contrasenia);
      if (r.tipo === "sesion") return entrar(r.sesion);
      setCorreo(c);
      setTmpToken(r.tmpToken);
      setAviso(`Enviamos un código de 6 dígitos${r.canal ? ` por ${r.canal}` : ""}.`);
      setPaso("codigo");
    });
  };

  const onCodigo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const codigo = valor(e, "codigo").trim();
    return ejecutar(async () => entrar(await portalService.verificar(tmpToken, codigo)));
  };

  const onRecuperar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const c = valor(e, "correo").trim().toLowerCase();
    return ejecutar(async () => {
      await portalService.recuperar(c);
      setCorreo(c);
      setAviso("Si el correo existe, enviamos un código de recuperación.");
      setPaso("restablecer");
    });
  };

  const onRestablecer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const codigo = valor(e, "codigo").trim();
    const nueva = valor(e, "nueva");
    return ejecutar(async () => {
      await portalService.restablecer(correo, codigo, nueva);
      setPaso("credenciales");
      setAviso("Contraseña actualizada. Ya puedes iniciar sesión.");
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
      {paso === "credenciales" && (
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
      )}

      {paso === "codigo" && (
        <>
          <h2>Verifica tu identidad</h2>
          <form onSubmit={onCodigo} noValidate>
            <label>Código de 6 dígitos<input className="p-input" name="codigo" inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label>
            {mensajes}
            <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "VERIFICANDO…" : "VERIFICAR"}</button>
          </form>
          <button type="button" className="p-enlace" onClick={() => irA("credenciales")}>← Volver</button>
        </>
      )}

      {paso === "recuperar" && (
        <>
          <h2>Recuperar contraseña</h2>
          <form onSubmit={onRecuperar} noValidate>
            <label>Correo electrónico<input className="p-input" name="correo" type="email" autoComplete="email" /></label>
            {mensajes}
            <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "ENVIANDO…" : "ENVIAR CÓDIGO"}</button>
          </form>
          <button type="button" className="p-enlace" onClick={() => irA("credenciales")}>← Volver</button>
        </>
      )}

      {paso === "restablecer" && (
        <>
          <h2>Nueva contraseña</h2>
          <form onSubmit={onRestablecer} noValidate>
            <label>Código recibido<input className="p-input" name="codigo" inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label>
            <label>Nueva contraseña<input className="p-input" name="nueva" type="password" autoComplete="new-password" minLength={8} /></label>
            {mensajes}
            <button type="submit" className="p-btn p-btn--lg p-btn--bloque" disabled={cargando}>{cargando ? "GUARDANDO…" : "CAMBIAR CONTRASEÑA"}</button>
          </form>
          <button type="button" className="p-enlace" onClick={() => irA("credenciales")}>← Volver</button>
        </>
      )}
    </AuthLayout>
  );
}
