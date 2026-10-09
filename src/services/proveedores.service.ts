import { request } from "./http";
import type { Proveedor, ProveedorInput } from "../types";

export const proveedoresService = {
  async getAll(): Promise<Proveedor[]> {
    return request<Proveedor[]>("proveedor", "/proveedores");
  },
  async getById(id: number): Promise<Proveedor> {
    return request<Proveedor>("proveedor", `/proveedores/${id}`);
  },
  // Enviamos noNit (contrato Swagger/zod). La respuesta trae no_nit.
  async create(data: ProveedorInput): Promise<Proveedor> {
    return request<Proveedor>("proveedor", "/proveedores", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<ProveedorInput>): Promise<Proveedor> {
    return request<Proveedor>("proveedor", `/proveedores/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};