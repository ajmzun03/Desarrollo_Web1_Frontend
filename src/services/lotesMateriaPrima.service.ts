import { request, toQuery } from "./http";
import type { LoteMateriaPrima } from "../types";

export const lotesMateriaPrimaService = {
  // Endpoint real: GET /bodegas/lotes/fefo (lotes ordenados por vencimiento).
  // En modo mock el archivo expone todos los lotes al margen de los parámetros.
  async getFefo(bodegaId: number, materiaPrimaId: number): Promise<LoteMateriaPrima[]> {
    return request<LoteMateriaPrima[]>(
      "lote-materia-prima",
      `/bodegas/lotes/fefo${toQuery({ bodega_id: bodegaId, materia_prima_id: materiaPrimaId })}`
    );
  },
};