import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { getCookie } from "../utils/cookies";
import type { RolUsuario } from "../types";
import { Layout } from "./Layout";

interface Props {
  ruta: string;
  roles?: RolUsuario[];
  children: ReactNode;
}

// Protege una ruta: exige sesion (cookie token) y, si se indica, que el rol
// del usuario este en la lista. Envuelve el contenido en el Layout compartido.
export const RutaProtegida = ({ ruta, roles, children }: Props) => {
  const token = getCookie("token");

  if (!token) {
    return <Redirect to="/copac/login" replace />;
  }

  if (roles && roles.length > 0) {
    let rol: RolUsuario | null = null;
    try {
      const usuario = JSON.parse(getCookie("usuario") ?? "null");
      rol = usuario?.rol ?? null;
    } catch {
      // cookie de usuario no legible; se trata como sin rol
    }
    if (!rol || !roles.includes(rol)) {
      return <Redirect to="/copac/login" replace />;
    }
  }

  return <Layout rutaActiva={ruta}>{children}</Layout>;
};