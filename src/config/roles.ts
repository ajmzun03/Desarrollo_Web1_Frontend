import type { RolUsuario } from "../types";

// Mapa de acceso propuesto segun el plan aprobado.
// Nota: el backend expone endpoints con requireRole, pero no conocemos
// todavia los guards de las vistas nuevas; esto es solo control de UI.
export const ROLES_POR_RUTA: Record<string, RolUsuario[]> = {
  "/copac/ventas": ["ADMIN", "CAJERO"],
  "/copac/cocina": ["ADMIN", "BODEGUERO"],
  "/copac/despacho": ["ADMIN", "DESPACHADOR"],
  "/copac/compras": ["ADMIN", "BODEGUERO"],
  "/copac/notificaciones": ["ADMIN", "BODEGUERO", "DESPACHADOR", "REPARTIDOR", "CAJERO"],
  // Rutas nuevas (Fase 1). Propuesta aprobada; el repartidor también es accesible por ADMIN.
  "/copac/bodega": ["ADMIN", "BODEGUERO"],
  "/copac/repartidor": ["ADMIN", "REPARTIDOR"],
  "/copac/dashboard": ["ADMIN"],
  "/copac/reportes": ["ADMIN"],
  "/copac/auditoria": ["ADMIN"],
};

export const TODOS_LOS_ROLES: RolUsuario[] = [
  "ADMIN",
  "BODEGUERO",
  "DESPACHADOR",
  "REPARTIDOR",
  "CAJERO",
];

export function tieneAcceso(rol: RolUsuario | null | undefined, ruta: string): boolean {
  if (!rol) return false;
  const permitidos = ROLES_POR_RUTA[ruta];
  if (!permitidos) return true;
  return permitidos.includes(rol);
}
