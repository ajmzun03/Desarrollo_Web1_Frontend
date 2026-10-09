import { request, toQuery } from "./http";
import type { HojaRecepcion, HojaRecepcionConDetalles, HojaRecepcionCreateInput } from "../types";

export const hojasRecepcionService = {
  async getAll(sucursalId?: number): Promise<HojaRecepcion[]> {
    return request<HojaRecepcion[]>("hoja-recepcion", `/hojas-recepcion${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<HojaRecepcionConDetalles> {
    return request<HojaRecepcionConDetalles>("hoja-recepcion", `/hojas-recepcion/${id}`);
  },
  async create(data: HojaRecepcionCreateInput): Promise<HojaRecepcionConDetalles> {
    return request<HojaRecepcionConDetalles>("hoja-recepcion", "/hojas-recepcion", { method: "POST", body: JSON.stringify(data) });
  },
};