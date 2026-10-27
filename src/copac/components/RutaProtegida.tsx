import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { getCookie } from "../utils/cookies";
import { leerVistas } from "../utils/sesion";
import { tieneAcceso } from "../config/roles";
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

  let rol: RolUsuario | null = null;
  try {
    const usuario = JSON.parse(getCookie("usuario") ?? "null");
    rol = usuario?.rol ?? null;
  } catch {
    // cookie de usuario no legible; se trata como sin rol
  }

  // Acceso por vistas del backend; `roles` (mapa estatico) solo se usa si la sesion aun no trae vistas.
  const vistas = leerVistas();
  const permitido = vistas ? tieneAcceso(rol, ruta, vistas) : !roles || roles.length === 0 || (!!rol && roles.includes(rol));
  if (!permitido) {
    return <Redirect to="/copac/login" replace />;
  }

  return <Layout rutaActiva={ruta}>{children}</Layout>;
};