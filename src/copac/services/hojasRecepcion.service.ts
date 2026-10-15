import { ApiError, request, toQuery } from "./http";
import { USE_MOCKS } from "../config/api";
import type { HojaRecepcion, HojaRecepcionConDetalles, HojaRecepcionCreateInput, HojaRecepcionDetalle } from "../types";

export const hojasRecepcionService = {
  async getAll(sucursalId?: number): Promise<HojaRecepcion[]> {
    return request<HojaRecepcion[]>("hoja-recepcion", `/hojas-recepcion${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<HojaRecepcionConDetalles> {
    if (USE_MOCKS) {
      const [hojas, detalles] = await Promise.all([
        request<HojaRecepcion[]>("hoja-recepcion", "/hojas-recepcion"),
        request<HojaRecepcionDetalle[]>("hoja-recepcion-detalle", "/hojas-recepcion-detalles"),
      ]);
      const hoja = hojas.find((h) => h.id === id);
      if (!hoja) throw new ApiError(`Hoja de recepción ${id} no encontrada.`);
      return { ...hoja, detalles: detalles.filter((d) => d.hoja_recepcion_id === id) };
    }
    return request<HojaRecepcionConDetalles>("hoja-recepcion", `/hojas-recepcion/${id}`);
  },
  async create(data: HojaRecepcionCreateInput): Promise<HojaRecepcionConDetalles> {
    return request<HojaRecepcionConDetalles>("hoja-recepcion", "/hojas-recepcion", { method: "POST", body: JSON.stringify(data) });
  },
};