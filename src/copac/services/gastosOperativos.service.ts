import { request } from "./http";
import type { GastoOperativo } from "../types";

// TEMPORAL: no existe tabla ni endpoint de gastos operativos en el backend.
// Cuando exista, reemplazar el mock por GET /gastos-operativos (o similar).
export const gastosOperativosService = {
  async getAll(): Promise<GastoOperativo[]> {
    // TODO: endpoint pendiente en backend.
    return request<GastoOperativo[]>("gastos-operativos", "/gastos-operativos");
  },
};
