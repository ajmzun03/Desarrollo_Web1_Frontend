import { useState } from "react";
import type { FormEvent } from "react";
import { setCookie } from "../utils/cookies";
import { authService } from "../services/auth.service";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";

// Ruta inicial según el rol del usuario que inició sesión.
const primeraRuta = (rol: string): string => {
  if (rol === "ADMIN") return "/copac/dashboard";
  if (rol === "CAJERO") return "/copac/ventas";
  if (rol === "BODEGUERO") return "/copac/cocina";
  if (rol === "DESPACHADOR") return "/copac/despacho";
  return "/copac/notificaciones";
};

export const Form = () => {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const formData = new FormData(e.currentTarget);

    try {
      const sesion = await authService.login(
        String(formData.get("usuario") ?? ""),
        String(formData.get("contrasenia") ?? "")
      );

      const recordar = formData.get("remember") === "on";
      const UN_DIA = 60 * 60 * 24; // el token dura 24 h

      // Con "Recordar sesión" la cookie dura 1 día; sin ella, se borra al cerrar el navegador
      setCookie("token", sesion.token, recordar ? UN_DIA : undefined);
      setCookie("usuario", JSON.stringify(sesion.usuario), recordar ? UN_DIA : undefined);

      window.location.assign(primeraRuta(sesion.usuario.rol));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Usuario"
        name="usuario"
        type="text"
        placeholder="Ingresa tu usuario"
      />
      <Input
        label="Contraseña"
        name="contrasenia"
        type="password"
        placeholder="Ingresa tu contraseña"
      />

      {error && <div className="login__error">{error}</div>}

      <div className="form__remember">
        <Checkbox
          label="Recordar sesión"
          name="remember" />
        <a href="#reset-password">¿Olvidaste tu contraseña?</a>
      </div>

      <button type="submit" disabled={cargando}>
        {cargando ? "Ingresando…" : "Ingresar al sistema"}
      </button>
    </form>
  );
};