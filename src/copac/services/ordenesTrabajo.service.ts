import { request, toQuery } from "./http";
import type { EstadoOrdenTrabajo, OrdenTrabajo, OrdenTrabajoCreateInput, ProductoLote, RecetaConDetalles } from "../types";

export const ordenesTrabajoService = {
  async getAll(sucursalId?: number, estado?: EstadoOrdenTrabajo): Promise<OrdenTrabajo[]> {
    return request<OrdenTrabajo[]>("orden-trabajo", `/ordenes-trabajo${toQuery({ sucursal_id: sucursalId, estado })}`);
  },
  async getCola(sucursalId?: number): Promise<OrdenTrabajo[]> {
    return request<OrdenTrabajo[]>("orden-trabajo", `/ordenes-trabajo/cola${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<OrdenTrabajo> {
    return request<OrdenTrabajo>("orden-trabajo", `/ordenes-trabajo/${id}`);
  },
  async getReceta(id: number): Promise<RecetaConDetalles> {
    return request<RecetaConDetalles>("receta", `/ordenes-trabajo/${id}/receta`);
  },
  async create(data: OrdenTrabajoCreateInput): Promise<OrdenTrabajo> {
    return request<OrdenTrabajo>("orden-trabajo", "/ordenes-trabajo", { method: "POST", body: JSON.stringify(data) });
  },
  async updateEstado(id: number, estado: EstadoOrdenTrabajo): Promise<OrdenTrabajo> {
    return request<OrdenTrabajo>("orden-trabajo", `/ordenes-trabajo/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },
  async iniciar(id: number): Promise<OrdenTrabajo> {
    return request<OrdenTrabajo>("orden-trabajo", `/ordenes-trabajo/${id}/iniciar`, { method: "PATCH" });
  },
  async terminar(id: number): Promise<OrdenTrabajo & { lote: ProductoLote }> {
    return request<OrdenTrabajo & { lote: ProductoLote }>("orden-trabajo", `/ordenes-trabajo/${id}/terminar`, { method: "PATCH" });
  },
};