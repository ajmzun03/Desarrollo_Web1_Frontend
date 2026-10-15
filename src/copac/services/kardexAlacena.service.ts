import { request, toQuery } from "./http";
import type { KardexAlacena } from "../types";

export const kardexAlacenaService = {
  // Requires role ADMIN en el backend.
  async getAll(alacenaId?: number): Promise<KardexAlacena[]> {
    return request<KardexAlacena[]>("kardex-alacena", `/kardex-alacena${toQuery({ alacena_id: alacenaId })}`);
  },
};