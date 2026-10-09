import { request, toQuery } from "./http";
import type { Alacena } from "../types";

export interface AlacenaInput {
  bodega_id?: number;
  alacena: string;
}

export const alacenasService = {
  async getAll(bodegaId?: number): Promise<Alacena[]> {
    return request<Alacena[]>("alacena", `/alacenas${toQuery({ bodega_id: bodegaId })}`);
  },
  async getById(id: number): Promise<Alacena> {
    return request<Alacena>("alacena", `/alacenas/${id}`);
  },
  async create(data: AlacenaInput): Promise<Alacena> {
    return request<Alacena>("alacena", "/alacenas", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<AlacenaInput>): Promise<Alacena> {
    return request<Alacena>("alacena", `/alacenas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};