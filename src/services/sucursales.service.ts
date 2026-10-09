import { request } from "./http";
import type { SucursalInput, Sucursal } from "../types";

export const sucursalesService = {
  async getAll(): Promise<Sucursal[]> {
    return request<Sucursal[]>("sucursal", "/sucursales");
  },
  async getById(id: number): Promise<Sucursal> {
    return request<Sucursal>("sucursal", `/sucursales/${id}`);
  },
  async create(data: SucursalInput): Promise<Sucursal> {
    return request<Sucursal>("sucursal", "/sucursales", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<SucursalInput>): Promise<Sucursal> {
    return request<Sucursal>("sucursal", `/sucursales/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};