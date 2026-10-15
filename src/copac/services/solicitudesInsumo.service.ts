import { request, toQuery } from "./http";
import type { DetalleSolicitudInsumo, EstadoSolicitudInsumo, SolicitudInsumo } from "../types";

export interface SolicitudInsumoItemInput {
  materia_prima_id: number;
  cantidad_solicitada: number;
}

export interface SolicitudInsumoInput {
  sucursal_id: number;
  solicitado_por?: number;
  items: SolicitudInsumoItemInput[];
}

// TODO: endpoint pendiente en backend.
// Las tablas SOLICITUD_INSUMO y DETALLE_SOLICITUD_INSUMO existen en model/,
// pero Swagger todavía no expone rutas para ellas; por ahora todo se resuelve
// con los mocks "solicitud-insumo" y "detalle-solicitud-insumo".
export const solicitudesInsumoService = {
  async getAll(sucursalId?: number): Promise<SolicitudInsumo[]> {
    return request<SolicitudInsumo[]>("solicitud-insumo", `/solicitudes-insumo${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<SolicitudInsumo> {
    return request<SolicitudInsumo>("solicitud-insumo", `/solicitudes-insumo/${id}`);
  },
  async getDetalles(solicitudId?: number): Promise<DetalleSolicitudInsumo[]> {
    return request<DetalleSolicitudInsumo[]>(
      "detalle-solicitud-insumo",
      `/solicitudes-insumo/detalles${toQuery({ solicitud_id: solicitudId })}`
    );
  },
  async create(data: SolicitudInsumoInput): Promise<SolicitudInsumo> {
    return request<SolicitudInsumo>("solicitud-insumo", "/solicitudes-insumo", { method: "POST", body: JSON.stringify(data) });
  },
  async updateEstado(id: number, estado: EstadoSolicitudInsumo): Promise<SolicitudInsumo> {
    return request<SolicitudInsumo>("solicitud-insumo", `/solicitudes-insumo/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },
};
