import { request, toQuery } from "./http";
import type { Bodega, LoteMateriaPrima } from "../types";

export interface BodegaInput {
  sucursal_id: number;
  bodega: string;
}

export const bodegasService = {
  async getAll(sucursalId?: number): Promise<Bodega[]> {
    return request<Bodega[]>("bodega", `/bodegas${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<Bodega> {
    return request<Bodega>("bodega", `/bodegas/${id}`);
  },
  // GET /bodegas/lotes/fefo: lotes ordenados por vencimiento (FEFO).
  async getLotesFefo(materiaPrimaId: number, bodegaId?: number): Promise<LoteMateriaPrima[]> {
    return request<LoteMateriaPrima[]>("lote-materia-prima", `/bodegas/lotes/fefo${toQuery({ bodega_id: bodegaId, materia_prima_id: materiaPrimaId })}`);
  },
  async create(data: BodegaInput): Promise<Bodega> {
    return request<Bodega>("bodega", "/bodegas", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<BodegaInput>): Promise<Bodega> {
    return request<Bodega>("bodega", `/bodegas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};