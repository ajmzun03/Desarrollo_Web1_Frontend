import { request, toQuery } from "./http";
import type { KardexBodega } from "../types";

export const kardexBodegaService = {
  // Requires role ADMIN en el backend.
  async getAll(bodegaId?: number, loteId?: number): Promise<KardexBodega[]> {
    return request<KardexBodega[]>("kardex-bodega", `/kardex-bodega${toQuery({ bodega_id: bodegaId, lote_id: loteId })}`);
  },
};