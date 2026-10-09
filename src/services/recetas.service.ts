import { request } from "./http";
import type { Receta, RecetaConDetalles, RecetaCreateInput } from "../types";

export const recetasService = {
  async getAll(): Promise<Receta[]> {
    return request<Receta[]>("receta", "/recetas");
  },
  async getById(id: number): Promise<RecetaConDetalles> {
    return request<RecetaConDetalles>("receta", `/recetas/${id}`);
  },
  async create(data: RecetaCreateInput): Promise<RecetaConDetalles> {
    return request<RecetaConDetalles>("receta", "/recetas", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<RecetaCreateInput>): Promise<Receta> {
    return request<Receta>("receta", `/recetas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};