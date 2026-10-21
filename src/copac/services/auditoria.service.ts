import { request } from "./http";
import { USE_MOCKS } from "../config/api";
import type { AuditoriaRegistro, EstadoAuditoria, ModuloAuditoria } from "../types";

// Movimiento tal como lo devuelve GET /reportes/auditoria/movimientos (ADMIN o GERENTE):
// facturas de venta/compra y kardex de bodega/alacena. No incluye usuario ni rol.
interface MovimientoApi {
  id: number;
  fecha: string;
  tipo: string;
  origen: "VENTA" | "COMPRA" | "BODEGA" | "ALACENA";
  total?: number;
  cantidad?: number;
}

const MODULO: Record<MovimientoApi["origen"], ModuloAuditoria> = {
  VENTA: "Ventas",
  COMPRA: "Compras",
  BODEGA: "Bodega",
  ALACENA: "Cocina",
};

const ACCION: Record<string, string> = {
  INGRESO: "Ingreso de inventario",
  SALIDA: "Salida de inventario",
  MERMA: "Registró merma",
  VENCIMIENTO: "Vencimiento de lote",
  TRASLADO: "Traslado de inventario",
};

const aRegistro = (m: MovimientoApi, n: number): AuditoriaRegistro => {
  const accion = m.origen === "VENTA" ? "Factura de venta emitida" : m.origen === "COMPRA" ? "Factura de compra registrada" : (ACCION[m.tipo] ?? m.tipo);
  const detalle = m.total !== undefined ? `Q ${Number(m.total).toFixed(2)}` : `${m.cantidad ?? 0} u.`;
  const estado: EstadoAuditoria = m.tipo === "MERMA" || m.tipo === "VENCIMIENTO" ? "ADVERTENCIA" : "EXITOSO";
  return {
    id: n + 1, // los ids de origen se repiten entre tablas; se numera para tener una clave unica
    fecha: m.fecha.includes("T") ? m.fecha : m.fecha.replace(" ", "T"),
    usuario: "—",
    rol: "—",
    modulo: MODULO[m.origen] ?? "Sistema",
    accion,
    registro: `${m.origen} #${m.id} · ${detalle}`,
    estado,
  };
};

export const auditoriaService = {
  async getAll(): Promise<AuditoriaRegistro[]> {
    if (USE_MOCKS) return request<AuditoriaRegistro[]>("auditoria", "/auditoria");
    const r = await request<{ movimientos: MovimientoApi[] }>("auditoria", "/reportes/auditoria/movimientos");
    return r.movimientos.map(aRegistro);
  },
};
