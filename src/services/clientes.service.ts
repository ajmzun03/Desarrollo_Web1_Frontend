import { request, toQuery } from "./http";
import type { Cliente } from "../types";

export const clientesService = {
  async getAll(telefono?: string): Promise<Cliente[]> {
    return request<Cliente[]>("cliente", `/clientes${toQuery({ telefono })}`);
  },
  async getById(id: number): Promise<Cliente> {
    return request<Cliente>("cliente", `/clientes/${id}`);
  },
  async create(data: Omit<Cliente, "id" | "creado_en">): Promise<Cliente> {
    return request<Cliente>("cliente", "/clientes", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<Omit<Cliente, "id" | "creado_en">>): Promise<Cliente> {
    return request<Cliente>("cliente", `/clientes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};