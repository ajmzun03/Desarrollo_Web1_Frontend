import { useState } from "react";
import type { FormEvent } from "react";
import { setCookie } from "../utils/cookies";
import { authService, type Sesion } from "../services/auth.service";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";

// Ruta inicial según el rol del usuario que inició sesión.
const primeraRuta = (rol: string): string => {
  if (rol === "ADMIN" || rol === "GERENTE") return "/copac/dashboard";
  if (rol === "CAJERO") return "/copac/ventas";
  if (rol === "BODEGUERO") return "/copac/bodega";
  if (rol === "COMPRAS") return "/copac/compras";
  if (rol === "COCINERO" || rol === "JEFE_COCINA") return "/copac/cocina";
  if (rol === "DESPACHADOR") return "/copac/despacho";
  if (rol === "REPARTIDOR") return "/copac/repartidor";
  return "/copac/notificaciones";
};

type Paso = "credenciales" | "codigo" | "recuperar" | "restablecer";

const valor = (e: FormEvent<HTMLFormElement>, nombre: string) => String(new FormData(e.currentTarget).get(nombre) ?? "");

export const Form = () => {
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [tmpToken, setTmpToken] = useState("");
  const [identificador, setIdentificador] = useState("");

  const iniciarSesion = (sesion: Sesion) => {
    const UN_DIA = 60 * 60 * 24; // el token dura 24 h
    // Con "Recordar sesión" la cookie dura 1 día; sin ella, se borra al cerrar el navegador
    const duracion = recordar ? UN_DIA : undefined;
    // Solo lo necesario: una cookie no puede pasar de ~4 KB.
    const { id, usuario, correo_electronico, rol } = sesion.usuario;
    setCookie("token", sesion.token, duracion);
    setCookie("usuario", JSON.stringify({ id, usuario, correo_electronico, rol }), duracion);
    window.location.assign(primeraRuta(rol));
  };

  // Ejecuta una accion async mostrando carga y errores de forma uniforme.
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

  const onCredenciales = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const usuario = valor(e, "usuario").trim();
    const contrasenia = valor(e, "contrasenia");
    setRecordar(valor(e, "remember") === "on");
    return ejecutar(async () => {
      const r = await authService.login(usuario, contrasenia);
      if (r.tipo === "sesion") return iniciarSesion(r.sesion);
      setTmpToken(r.tmpToken);
      setAviso(`Enviamos un código de 6 dígitos${r.canal ? ` por ${r.canal}` : ""}. Tiene vigencia limitada.`);
      setPaso("codigo");
    });
  };

  const onCodigo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const codigo = valor(e, "codigo").trim();
    return ejecutar(async () => iniciarSesion(await authService.verificar(tmpToken, codigo)));
  };

  const onRecuperar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = valor(e, "identificador").trim();
    return ejecutar(async () => {
      await authService.recuperar(id);
      setIdentificador(id);
      setAviso("Si la cuenta existe, enviamos un código de recuperación.");
      setPaso("restablecer");
    });
  };

  const onRestablecer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const codigo = valor(e, "codigo").trim();
    const nueva = valor(e, "nuevaContrasenia");
    return ejecutar(async () => {
      await authService.restablecer(identificador, codigo, nueva);
      setPaso("credenciales");
      setAviso("Contraseña actualizada. Ya puedes iniciar sesión.");
    });
  };

  const irA = (siguiente: Paso) => {
    setPaso(siguiente);
    setError(null);
    setAviso(null);
  };

  const mensajes = (
    <>
      {error && <div className="login__error" role="alert">{error}</div>}
      {aviso && <div className="login__aviso" role="status">{aviso}</div>}
    </>
  );

  if (paso === "codigo") {
    return (
      <form onSubmit={onCodigo}>
        <Input label="Código de verificación" name="codigo" type="text" placeholder="6 dígitos" />
        {mensajes}
        <button type="submit" disabled={cargando}>{cargando ? "Verificando…" : "Verificar e ingresar"}</button>
        <button type="button" className="login__enlace" onClick={() => irA("credenciales")}>Volver</button>
      </form>
    );
  }

  if (paso === "recuperar") {
    return (
      <form onSubmit={onRecuperar}>
        <Input label="Usuario o correo" name="identificador" type="text" placeholder="Tu usuario o correo electrónico" />
        {mensajes}
        <button type="submit" disabled={cargando}>{cargando ? "Enviando…" : "Enviar código"}</button>
        <button type="button" className="login__enlace" onClick={() => irA("credenciales")}>Volver</button>
      </form>
    );
  }

  if (paso === "restablecer") {
    return (
      <form onSubmit={onRestablecer}>
        <Input label="Código recibido" name="codigo" type="text" placeholder="6 dígitos" />
        <Input label="Nueva contraseña" name="nuevaContrasenia" type="password" placeholder="Mínimo 8 caracteres" />
        {mensajes}
        <button type="submit" disabled={cargando}>{cargando ? "Guardando…" : "Cambiar contraseña"}</button>
        <button type="button" className="login__enlace" onClick={() => irA("credenciales")}>Volver</button>
      </form>
    );
  }

  return (
    <form onSubmit={onCredenciales}>
      <Input label="Usuario" name="usuario" type="text" placeholder="Ingresa tu usuario" />
      <Input label="Contraseña" name="contrasenia" type="password" placeholder="Ingresa tu contraseña" />

      {mensajes}

      <div className="form__remember">
        <Checkbox label="Recordar sesión" name="remember" />
        <a
          href="#recuperar"
          onClick={(e) => {
            e.preventDefault();
            irA("recuperar");
          }}
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <button type="submit" disabled={cargando}>
        {cargando ? "Ingresando…" : "Ingresar al sistema"}
      </button>
    </form>
  );
};
