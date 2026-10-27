import { ROLES, type RolUsuario } from "../types";

// Mapa de acceso propuesto segun el plan aprobado.
// Nota: el backend expone endpoints con requireRole, pero no conocemos
// todavia los guards de las vistas nuevas; esto es solo control de UI.
export const ROLES_POR_RUTA: Record<string, RolUsuario[]> = {
  "/copac/dashboard": ["ADMIN", "GERENTE"],
  "/copac/ventas": ["ADMIN", "GERENTE", "CAJERO"],
  "/copac/cocina": ["ADMIN", "BODEGUERO", "JEFE_COCINA", "COCINERO"],
  "/copac/despacho": ["ADMIN", "GERENTE", "DESPACHADOR"],
  "/copac/compras": ["ADMIN", "GERENTE", "BODEGUERO", "COMPRAS"],
  "/copac/bodega": ["ADMIN", "BODEGUERO"],
  "/copac/repartidor": ["ADMIN", "REPARTIDOR"],
  "/copac/reportes": ["ADMIN", "GERENTE"],
  "/copac/auditoria": ["ADMIN"],
  "/copac/notificaciones": [...ROLES],
  "/copac/usuarios": ["ADMIN"],
};

export const TODOS_LOS_ROLES: RolUsuario[] = [...ROLES];

// Vistas (claves del backend, ver src/config/vistas.ts del backend) que habilitan cada ruta del panel.
// Basta con tener UNA de ellas. El backend es la fuente de verdad: cada endpoint vuelve a validar el permiso.
export const VISTAS_POR_RUTA: Record<string, string[]> = {
  "/copac/dashboard": ["dashboard"],
  "/copac/ventas": ["pos"],
  "/copac/cocina": ["cocina"],
  "/copac/despacho": ["despacho"],
  "/copac/repartidor": ["repartidor"],
  "/copac/compras": ["compras", "ordenes-compra"],
  "/copac/bodega": ["bodegas", "recepcion"],
  "/copac/reportes": ["reportes"],
  "/copac/auditoria": ["reportes"],
  "/copac/usuarios": ["usuarios"],
};

// Con la lista de vistas del backend se decide por vistas; si aun no se tiene (sesion antigua),
// se cae al mapa estatico por rol.
export function tieneAcceso(rol: RolUsuario | null | undefined, ruta: string, vistas?: string[] | null): boolean {
  if (!rol) return false;
  const requeridas = VISTAS_POR_RUTA[ruta];
  if (vistas && requeridas) return requeridas.some((v) => vistas.includes(v));
  const permitidos = ROLES_POR_RUTA[ruta];
  if (!permitidos) return true;
  return permitidos.includes(rol);
}

export const ROL_LABEL: Record<RolUsuario, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  BODEGUERO: "Bodeguero",
  DESPACHADOR: "Despachador",
  REPARTIDOR: "Repartidor",
  CAJERO: "Cajero",
  COMPRAS: "Encargado de compras",
  COCINERO: "Cocinero",
  JEFE_COCINA: "Jefe de cocina",
};
