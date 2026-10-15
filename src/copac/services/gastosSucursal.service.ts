import { request, toQuery } from "./http";
import type { GastosSucursal } from "../types";

export interface GastoSucursalInput {
  sucursal_id: number;
  caja_id?: number;
  usuario_id?: number;
  monto_apertura?: number;
  monto_cierre_declarado?: number;
  monto_cierre_sistema?: number;
}

export const gastosSucursalService = {
  async getAll(sucursalId?: number): Promise<GastosSucursal[]> {
    return request<GastosSucursal[]>("gastos-sucursal", `/gastos-sucursal${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getById(id: number): Promise<GastosSucursal> {
    return request<GastosSucursal>("gastos-sucursal", `/gastos-sucursal/${id}`);
  },
  async create(data: GastoSucursalInput): Promise<GastosSucursal> {
    return request<GastosSucursal>("gastos-sucursal", "/gastos-sucursal", { method: "POST", body: JSON.stringify(data) });
  },
};