import { request } from "./http";
import type { MateriaPrima, MateriaPrimaInput } from "../types";

export const materiasPrimasService = {
  async getAll(): Promise<MateriaPrima[]> {
    return request<MateriaPrima[]>("materia-prima", "/materias-primas");
  },
  async getById(id: number): Promise<MateriaPrima> {
    return request<MateriaPrima>("materia-prima", `/materias-primas/${id}`);
  },
  async create(data: MateriaPrimaInput): Promise<MateriaPrima> {
    return request<MateriaPrima>("materia-prima", "/materias-primas", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<MateriaPrimaInput>): Promise<MateriaPrima> {
    return request<MateriaPrima>("materia-prima", `/materias-primas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};