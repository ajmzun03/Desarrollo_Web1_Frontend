import { request, toQuery } from "./http";
import type { Direccion } from "../types";

export const direccionesService = {
  async getAll(clienteId?: number): Promise<Direccion[]> {
    return request<Direccion[]>("direccion", `/direcciones${toQuery({ cliente_id: clienteId })}`);
  },
  async getById(id: number): Promise<Direccion> {
    return request<Direccion>("direccion", `/direcciones/${id}`);
  },
  async create(data: Omit<Direccion, "id">): Promise<Direccion> {
    return request<Direccion>("direccion", "/direcciones", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<Omit<Direccion, "id">>): Promise<Direccion> {
    return request<Direccion>("direccion", `/direcciones/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};