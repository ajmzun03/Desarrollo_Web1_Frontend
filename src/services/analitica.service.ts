import { request } from "./http";
import { USE_MOCKS } from "../config/api";
import { pedidosService } from "./pedidos.service";
import { facturasVentaService } from "./facturasVenta.service";
import { facturasCompraService } from "./facturasCompra.service";
import { clientesService } from "./clientes.service";
import { productosService } from "./productos.service";
import { notificacionesService } from "./notificaciones.service";
import { gastosSucursalService } from "./gastosSucursal.service";
import { sucursalesService } from "./sucursales.service";
import { kardexBodegaService } from "./kardexBodega.service";
import { kardexAlacenaService } from "./kardexAlacena.service";
import type {
  Cliente,
  DetallePedido,
  FacturaCompra,
  FacturaVenta,
  GastosSucursal,
  KardexAlacena,
  KardexBodega,
  Notificacion,
  Pedido,
  Producto,
  Sucursal,
} from "../types";

// Agregaciones para Dashboard, Reportes y Auditoria.
// La API documenta GET /reportes/* pero no su formato de respuesta, asi que estas
// vistas se calculan en el cliente con los endpoints tipados (pedidos, facturas, kardex).
// Cuando el backend documente /reportes/*, se pueden reemplazar aqui sin tocar las vistas.

export interface BaseVentas {
  pedidos: Pedido[];
  facturas: FacturaVenta[];
  clientes: Cliente[];
  productos: Producto[];
  notificaciones: Notificacion[];
}

export interface BaseFinanzas {
  facturasVenta: FacturaVenta[];
  facturasCompra: FacturaCompra[];
  pedidos: Pedido[];
  productos: Producto[];
  cierres: GastosSucursal[];
  sucursales: Sucursal[];
}

export interface Movimiento {
  id: string;
  fecha: string;
  modulo: "Ventas" | "Compras" | "Bodega" | "Alacena";
  accion: string;
  registro: string;
  cantidad: string;
  estado: "Exitoso" | "Advertencia" | "Anulación";
}

const MAX_PEDIDOS_CON_DETALLE = 25;

// Lineas de detalle de los pedidos dados. El mock tiene un listado; la API real solo
// devuelve los detalles dentro de GET /pedidos/{id}, asi que se limita a los mas recientes.
export async function getDetallesDe(pedidos: Pedido[]): Promise<DetallePedido[]> {
  const validos = pedidos.filter((p) => p.estado !== "ANULADO");
  if (USE_MOCKS) {
    const todos = await request<DetallePedido[]>("detalle-pedido", "/detalles-pedido");
    const ids = new Set(validos.map((p) => p.id));
    return todos.filter((d) => d.pedido_id !== null && ids.has(d.pedido_id));
  }
  const recientes = [...validos].sort((a, b) => b.fecha_pedido.localeCompare(a.fecha_pedido)).slice(0, MAX_PEDIDOS_CON_DETALLE);
  const completos = await Promise.allSettled(recientes.map((p) => pedidosService.getById(p.id)));
  return completos.flatMap((r) => (r.status === "fulfilled" ? r.value.detalles : []));
}

export const analiticaService = {
  async getBaseVentas(): Promise<BaseVentas> {
    const [pedidos, facturas, clientes, productos, notificaciones] = await Promise.all([
      pedidosService.getAll(),
      facturasVentaService.getAll(),
      clientesService.getAll(),
      productosService.getAll(),
      notificacionesService.getAll().catch(() => [] as Notificacion[]),
    ]);
    return { pedidos, facturas, clientes, productos, notificaciones };
  },

  async getBaseFinanzas(): Promise<BaseFinanzas> {
    const [facturasVenta, facturasCompra, pedidos, productos, cierres, sucursales] = await Promise.all([
      facturasVentaService.getAll(),
      facturasCompraService.getAll(),
      pedidosService.getAll(),
      productosService.getAll(),
      gastosSucursalService.getAll(),
      sucursalesService.getAll(),
    ]);
    return { facturasVenta, facturasCompra, pedidos, productos, cierres, sucursales };
  },

  // Movimientos de auditoria. Cada fuente que falle se reporta en `fallidas` sin romper el resto
  // (por ejemplo, el kardex exige rol ADMIN en el backend).
  async getMovimientos(): Promise<{ movimientos: Movimiento[]; fallidas: string[] }> {
    const fuentes = await Promise.allSettled([
      facturasVentaService.getAll(),
      facturasCompraService.getAll(),
      pedidosService.getAll(),
      kardexBodegaService.getAll(),
      kardexAlacenaService.getAll(),
    ]);
    const nombres = ["Facturas de venta", "Facturas de compra", "Pedidos", "Kardex de bodega", "Kardex de alacena"];
    const fallidas = fuentes.flatMap((f, i) => (f.status === "rejected" ? [nombres[i]] : []));
    const val = <T,>(i: number): T[] => (fuentes[i].status === "fulfilled" ? (fuentes[i].value as T[]) : []);

    const movimientos: Movimiento[] = [
      ...val<FacturaVenta>(0).map((f): Movimiento => ({
        id: `fv-${f.id}`, fecha: f.fecha_emision, modulo: "Ventas", accion: "Factura emitida",
        registro: `${f.serie}-${f.numero} · Pedido #${f.pedido_id}`, cantidad: `Q ${f.total.toFixed(2)}`, estado: "Exitoso",
      })),
      ...val<FacturaCompra>(1).map((f): Movimiento => ({
        id: `fc-${f.id}`, fecha: f.fecha_ingreso, modulo: "Compras", accion: "Factura de compra registrada",
        registro: `${f.serie}-${f.numero}`, cantidad: `Q ${f.total.toFixed(2)}`, estado: "Exitoso",
      })),
      ...val<Pedido>(2)
        .filter((p) => p.estado === "ANULADO")
        .map((p): Movimiento => ({
          id: `pa-${p.id}`, fecha: p.fecha_pedido, modulo: "Ventas", accion: "Anuló pedido",
          registro: `Pedido #${p.id}`, cantidad: `Q ${p.total.toFixed(2)}`, estado: "Anulación",
        })),
      ...val<KardexBodega>(3).map((k): Movimiento => ({
        id: `kb-${k.id}`, fecha: k.fecha_movimiento, modulo: "Bodega", accion: accionKardex(k.tipo_movimiento),
        registro: `Bodega #${k.bodega_id} · Lote #${k.lote_id}`, cantidad: String(k.cantidad), estado: estadoKardex(k.tipo_movimiento),
      })),
      ...val<KardexAlacena>(4).map((k): Movimiento => ({
        id: `ka-${k.id}`, fecha: k.fecha_movimiento, modulo: "Alacena", accion: accionKardex(k.tipo_movimiento),
        registro: `Alacena #${k.alacena_id ?? "—"} · Lote #${k.lote_id ?? "—"}`, cantidad: String(k.cantidad), estado: estadoKardex(k.tipo_movimiento),
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    return { movimientos, fallidas };
  },
};

const accionKardex = (t: string) =>
  ({ INGRESO: "Ingreso", SALIDA: "Salida", MERMA: "Registró merma", VENCIMIENTO: "Vencimiento de lote", TRASLADO: "Traslado" } as Record<string, string>)[t] ?? t;

const estadoKardex = (t: string): Movimiento["estado"] => (t === "MERMA" || t === "VENCIMIENTO" ? "Advertencia" : "Exitoso");
