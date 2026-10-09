import { request } from "./http";
import type { UnidadMedida, UnidadMedidaInput } from "../types";

export const unidadesMedidaService = {
  async getAll(): Promise<UnidadMedida[]> {
    return request<UnidadMedida[]>("unidad-medida", "/unidades-medida");
  },
  async getById(id: number): Promise<UnidadMedida> {
    return request<UnidadMedida>("unidad-medida", `/unidades-medida/${id}`);
  },
  async create(data: UnidadMedidaInput): Promise<UnidadMedida> {
    return request<UnidadMedida>("unidad-medida", "/unidades-medida", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<UnidadMedidaInput>): Promise<UnidadMedida> {
    return request<UnidadMedida>("unidad-medida", `/unidades-medida/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};