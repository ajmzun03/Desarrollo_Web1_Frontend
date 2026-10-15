import { request, toQuery } from "./http";
import type { Caja, TipoCaja } from "../types";

export interface CajaInput {
  sucursal_id: number;
  nombre: string;
  tipo?: TipoCaja;
}

export const cajasService = {
  async getAll(sucursalId?: number): Promise<Caja[]> {
    return request<Caja[]>("caja", `/cajas${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<Caja> {
    return request<Caja>("caja", `/cajas/${id}`);
  },
  async create(data: CajaInput): Promise<Caja> {
    return request<Caja>("caja", "/cajas", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<CajaInput>): Promise<Caja> {
    return request<Caja>("caja", `/cajas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};