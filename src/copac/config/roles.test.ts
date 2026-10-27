import { describe, expect, it } from "vitest";
import { ROLES_POR_RUTA, tieneAcceso } from "./roles";

// Vistas reales que el backend entrega por rol (backend/src/config/vistas.ts)
const VISTAS_ADMIN = ["dashboard", "usuarios", "pos", "despacho", "reportes", "compras", "ordenes-compra", "bodegas", "recepcion", "cocina"];
const VISTAS_COCINERO = ["cocina", "ordenes-trabajo", "recetas", "solicitudes-insumo", "alacenas"];
const VISTAS_REPARTIDOR = ["repartidor", "pedidos-asignados", "liquidaciones"];
const VISTAS_CAJERO = ["pos", "pedidos", "clientes", "facturas-venta", "turnos", "cajas"];

describe("tieneAcceso con las vistas del backend", () => {
  it("un administrador entra a todo lo que sus vistas habilitan", () => {
    for (const ruta of ["/copac/dashboard", "/copac/ventas", "/copac/cocina", "/copac/despacho", "/copac/compras", "/copac/bodega", "/copac/reportes", "/copac/auditoria", "/copac/usuarios"]) {
      expect(tieneAcceso("ADMIN", ruta, VISTAS_ADMIN), ruta).toBe(true);
    }
  });

  it("un cocinero solo ve la cocina (y las notificaciones, que son para todos)", () => {
    expect(tieneAcceso("COCINERO", "/copac/cocina", VISTAS_COCINERO)).toBe(true);
    expect(tieneAcceso("COCINERO", "/copac/ventas", VISTAS_COCINERO)).toBe(false);
    expect(tieneAcceso("COCINERO", "/copac/usuarios", VISTAS_COCINERO)).toBe(false);
    expect(tieneAcceso("COCINERO", "/copac/reportes", VISTAS_COCINERO)).toBe(false);
    expect(tieneAcceso("COCINERO", "/copac/notificaciones", VISTAS_COCINERO)).toBe(true);
  });

  it("un repartidor solo ve su vista móvil", () => {
    expect(tieneAcceso("REPARTIDOR", "/copac/repartidor", VISTAS_REPARTIDOR)).toBe(true);
    expect(tieneAcceso("REPARTIDOR", "/copac/despacho", VISTAS_REPARTIDOR)).toBe(false);
  });

  it("un cajero entra a ventas pero no a reportes ni usuarios", () => {
    expect(tieneAcceso("CAJERO", "/copac/ventas", VISTAS_CAJERO)).toBe(true);
    expect(tieneAcceso("CAJERO", "/copac/reportes", VISTAS_CAJERO)).toBe(false);
    expect(tieneAcceso("CAJERO", "/copac/usuarios", VISTAS_CAJERO)).toBe(false);
  });

  it("las vistas del backend mandan sobre el mapa estático de roles", () => {
    // Aunque el mapa estático dijera que el rol puede, si el backend no entrega la vista, no entra.
    expect(ROLES_POR_RUTA["/copac/ventas"]).toContain("CAJERO");
    expect(tieneAcceso("CAJERO", "/copac/ventas", [])).toBe(false);
  });

  it("sin rol no entra a nada", () => {
    expect(tieneAcceso(null, "/copac/dashboard", VISTAS_ADMIN)).toBe(false);
  });
});

describe("tieneAcceso sin vistas (sesión anterior): cae al mapa por rol", () => {
  it("usa ROLES_POR_RUTA", () => {
    expect(tieneAcceso("ADMIN", "/copac/usuarios", null)).toBe(true);
    expect(tieneAcceso("CAJERO", "/copac/usuarios", null)).toBe(false);
    expect(tieneAcceso("GERENTE", "/copac/dashboard", undefined)).toBe(true);
    expect(tieneAcceso("COCINERO", "/copac/cocina")).toBe(true);
  });
});
