import { ApiError, request, toQuery } from "./http";
import { USE_MOCKS } from "../config/api";
import type { EstadoOrdenCompra, OrdenCompra, OrdenCompraConDetalles, OrdenCompraCreateInput, DetalleOrdenCompra } from "../types";

export const ordenesCompraService = {
  async getAll(estado?: EstadoOrdenCompra, sucursalId?: number): Promise<OrdenCompra[]> {
    return request<OrdenCompra[]>("orden-compra", `/ordenes-compra${toQuery({ estado, sucursal_id: sucursalId })}`);
  },
  async getProgramadas(bodegaId?: number): Promise<OrdenCompra[]> {
    return request<OrdenCompra[]>("orden-compra", `/ordenes-compra/programadas${toQuery({ bodega_id: bodegaId })}`);
  },
  async getById(id: number): Promise<OrdenCompraConDetalles> {
    if (USE_MOCKS) {
      const [ordenes, detalles] = await Promise.all([
        request<OrdenCompra[]>("orden-compra", "/ordenes-compra"),
        request<DetalleOrdenCompra[]>("detalle-orden-compra", "/detalles-orden-compra"),
      ]);
      const orden = ordenes.find((o) => o.id === id);
      if (!orden) throw new ApiError(`Orden de compra ${id} no encontrada.`);
      return { ...orden, detalles: detalles.filter((d) => d.orden_compra_id === id) };
    }
    return request<OrdenCompraConDetalles>("orden-compra", `/ordenes-compra/${id}`);
  },
  async create(data: OrdenCompraCreateInput): Promise<OrdenCompraConDetalles> {
    return request<OrdenCompraConDetalles>("orden-compra", "/ordenes-compra", { method: "POST", body: JSON.stringify(data) });
  },
  async agendar(id: number): Promise<OrdenCompra> {
    return request<OrdenCompra>("orden-compra", `/ordenes-compra/${id}/agendar`, { method: "PATCH" });
  },
  async updateEstado(id: number, estado: EstadoOrdenCompra): Promise<OrdenCompra> {
    return request<OrdenCompra>("orden-compra", `/ordenes-compra/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },
};