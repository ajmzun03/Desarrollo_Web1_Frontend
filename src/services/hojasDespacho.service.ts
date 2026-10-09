import { request } from "./http";
import type { HojaDespacho, HojaDespachoConDetalles, HojaDespachoCreateInput } from "../types";

export const hojasDespachoService = {
  async getAll(): Promise<HojaDespacho[]> {
    return request<HojaDespacho[]>("hoja-despacho", "/hojas-despacho");
  },
  async getById(id: number): Promise<HojaDespachoConDetalles> {
    return request<HojaDespachoConDetalles>("hoja-despacho", `/hojas-despacho/${id}`);
  },
  async create(data: HojaDespachoCreateInput): Promise<HojaDespachoConDetalles> {
    return request<HojaDespachoConDetalles>("hoja-despacho", "/hojas-despacho", { method: "POST", body: JSON.stringify(data) });
  },
};