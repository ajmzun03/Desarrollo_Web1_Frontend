import { useState } from "react";
import type { FormEvent } from "react";
import { setCookie } from "../utils/cookies";
import { guardarVistas } from "../utils/sesion";
import { ApiError } from "../services/http";
import { authService, type Enrolamiento, type Sesion } from "../services/auth.service";
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

// credenciales -> (enrolar | codigo) para el segundo factor; recuperar -> correo con enlace
// Cada paso es un <form key=...>: sin key, React reutiliza los campos sin estado (no controlados) entre
// pasos y el campo del codigo apareceria prellenado con la contrasena recien escrita.
type Paso = "credenciales" | "enrolar" | "codigo" | "recuperar";

const valor = (e: FormEvent<HTMLFormElement>, nombre: string) => String(new FormData(e.currentTarget).get(nombre) ?? "");

export const Form = () => {
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recordar, setRecordar] = useState(false);
  // El tmpToken vive solo en memoria (estado del componente): nunca en cookie ni localStorage.
  const [tmpToken, setTmpToken] = useState("");
  const [qr, setQr] = useState<Enrolamiento | null>(null);

  const iniciarSesion = (sesion: Sesion) => {
    const UN_DIA = 60 * 60 * 24; // el token dura 24 h
    // Con "Recordar sesión" la cookie dura 1 día; sin ella, se borra al cerrar el navegador
    const duracion = recordar ? UN_DIA : undefined;
    // Solo lo necesario: una cookie no puede pasar de ~4 KB.
    const { id, usuario, correo_electronico, rol } = sesion.usuario;
    setCookie("token", sesion.token, duracion);
    setCookie("usuario", JSON.stringify({ id, usuario, correo_electronico, rol }), duracion);
    if (sesion.vistas) guardarVistas(sesion.vistas);
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

  const irA = (siguiente: Paso) => {
    setPaso(siguiente);
    setError(null);
    setAviso(null);
  };

  // Vuelve al inicio descartando todo lo pendiente (sesion de verificacion vencida o agotada).
  const reiniciar = (mensaje: string) => {
    setTmpToken("");
    setQr(null);
    setPaso("credenciales");
    setAviso(null);
    setError(mensaje);
  };

  const cargarQr = async (token: string) => {
    setQr(await authService.enrolar(token));
    setPaso("enrolar");
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
      if (r.mfa === "enrolar") return cargarQr(r.tmpToken); // primera vez: configurar el autenticador
      setPaso("codigo");
    });
  };

  const onCodigo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const codigo = valor(e, "codigo").trim();
    if (!/^\d{6}$/.test(codigo)) return setError("El código debe tener 6 dígitos.");
    setError(null);
    setCargando(true);
    return authService
      .verificar(tmpToken, codigo)
      .then(iniciarSesion)
      .catch(async (err: unknown) => {
        const estado = err instanceof ApiError ? err.status : 0;
        const mensaje = err instanceof Error ? err.message : "No se pudo verificar el código.";
        if (estado === 429) return reiniciar(mensaje); // demasiados codigos incorrectos: la sesion pendiente se destruyo
        if (estado === 401 && /venci/i.test(mensaje)) return reiniciar(mensaje); // sesion de verificacion vencida
        if (estado === 409) {
          // Falta configurar el autenticador: se vuelve al paso del QR.
          try {
            return await cargarQr(tmpToken);
          } catch (e2) {
            return setError(e2 instanceof Error ? e2.message : mensaje);
          }
        }
        setError(mensaje); // 401 codigo incorrecto, 503 servicio no disponible, etc.
      })
      .finally(() => setCargando(false));
  };

  const onRecuperar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = valor(e, "identificador").trim();
    return ejecutar(async () => {
      await authService.recuperar(id);
      setPaso("credenciales");
      setAviso("Si la cuenta existe, enviamos un correo con el enlace para restablecer tu contraseña.");
    });
  };

  const mensajes = (
    <>
      {error && <div className="login__error" role="alert">{error}</div>}
      {aviso && <div className="login__aviso" role="status">{aviso}</div>}
    </>
  );

  if (paso === "enrolar" && qr) {
    return (
      <form key="enrolar" onSubmit={onCodigo}>
        <p className="login__instrucciones">
          Es tu primer ingreso. Escanea este código con una app autenticadora (Google Authenticator, Microsoft Authenticator, Authy…) y escribe el código de 6 dígitos que muestre.
        </p>
        <img className="login__qr" src={qr.qrCode} alt="Código QR para configurar la app autenticadora" width={200} height={200} />
        <p className="login__instrucciones">
          ¿No puedes escanear? Escribe esta clave en la app: <code className="login__secreto">{qr.secret}</code>
        </p>
        <Input label="Código de 6 dígitos" name="codigo" type="text" placeholder="123456" />
        {mensajes}
        <button type="submit" disabled={cargando}>{cargando ? "Verificando…" : "Activar e ingresar"}</button>
        <button type="button" className="login__enlace" onClick={() => reiniciar("")}>Cancelar</button>
      </form>
    );
  }

  if (paso === "codigo") {
    return (
      <form key="codigo" onSubmit={onCodigo}>
        <p className="login__instrucciones">Abre tu app autenticadora y escribe el código de 6 dígitos de COPAC.</p>
        <Input label="Código de verificación" name="codigo" type="text" placeholder="123456" />
        {mensajes}
        <button type="submit" disabled={cargando}>{cargando ? "Verificando…" : "Verificar e ingresar"}</button>
        <button type="button" className="login__enlace" onClick={() => reiniciar("")}>Volver</button>
      </form>
    );
  }

  if (paso === "recuperar") {
    return (
      <form key="recuperar" onSubmit={onRecuperar}>
        <p className="login__instrucciones">Te enviaremos un correo con un enlace para crear una contraseña nueva.</p>
        <Input label="Usuario o correo" name="identificador" type="text" placeholder="Tu usuario o correo electrónico" />
        {mensajes}
        <button type="submit" disabled={cargando}>{cargando ? "Enviando…" : "Enviar enlace"}</button>
        <button type="button" className="login__enlace" onClick={() => irA("credenciales")}>Volver</button>
      </form>
    );
  }

  return (
    <form key="credenciales" onSubmit={onCredenciales}>
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
