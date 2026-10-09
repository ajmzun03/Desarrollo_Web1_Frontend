import { request } from "./http";
import type { CategoriaInput, Categoria } from "../types";

export const categoriasService = {
  async getAll(): Promise<Categoria[]> {
    return request<Categoria[]>("categoria", "/categorias");
  },
  async getById(id: number): Promise<Categoria> {
    return request<Categoria>("categoria", `/categorias/${id}`);
  },
  async create(data: CategoriaInput): Promise<Categoria> {
    return request<Categoria>("categoria", "/categorias", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<CategoriaInput>): Promise<Categoria> {
    return request<Categoria>("categoria", `/categorias/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};