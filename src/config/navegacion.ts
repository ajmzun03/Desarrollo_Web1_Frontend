import { Bell, ClipboardList, FileBarChart, LayoutDashboard, Package, ScrollText, ShoppingBag, Users, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RolUsuario } from "../types";

export interface NavItem {
  path: string;
  label: string;
  titulo: string; // titulo mostrado en la barra superior
  icon: LucideIcon;
}

export interface NavGrupo {
  grupo: string;
  items: NavItem[];
}

// Menu lateral agrupado como en el diseno de Figma (COPAC Web System Design).
// Las rutas se muestran solo si el rol del usuario tiene acceso (ver config/roles.ts).
export const NAV_GRUPOS: NavGrupo[] = [
  {
    grupo: "General",
    items: [{ path: "/copac/dashboard", label: "Dashboard", titulo: "Dashboard Principal", icon: LayoutDashboard }],
  },
  {
    grupo: "Operaciones",
    items: [
      { path: "/copac/ventas", label: "Agente de Ventas", titulo: "Agente de Ventas", icon: ShoppingBag },
      { path: "/copac/cocina", label: "Módulo de Cocina", titulo: "Módulo de Cocina", icon: Utensils },
      { path: "/copac/despacho", label: "Centro de Despacho", titulo: "Centro de Despacho", icon: Package },
    ],
  },
  {
    grupo: "Abastecimiento",
    items: [{ path: "/copac/compras", label: "Compras", titulo: "Compras y Proveedores", icon: ClipboardList }],
  },
  {
    grupo: "Administración",
    items: [
      { path: "/copac/reportes", label: "Reportes", titulo: "Reportes y Finanzas", icon: FileBarChart },
      { path: "/copac/auditoria", label: "Auditoría", titulo: "Auditoría del Sistema", icon: ScrollText },
      { path: "/copac/notificaciones", label: "Notificaciones", titulo: "Notificaciones", icon: Bell },
      { path: "/copac/usuarios", label: "Usuarios", titulo: "Usuarios", icon: Users },
    ],
  },
];

export const ROL_LABEL: Record<RolUsuario, string> = {
  ADMIN: "Administrador",
  BODEGUERO: "Bodeguero",
  DESPACHADOR: "Despachador",
  REPARTIDOR: "Repartidor",
  CAJERO: "Cajero",
};
