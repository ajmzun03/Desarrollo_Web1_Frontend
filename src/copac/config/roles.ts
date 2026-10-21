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

export function tieneAcceso(rol: RolUsuario | null | undefined, ruta: string): boolean {
  if (!rol) return false;
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
