import { listaOpcional, request } from "./http";
import type { GastoOperativo } from "../types";

// El backend no tiene gastos operativos por categoria y mes (solo GET /reportes/gastos-operativos,
// que resume cierres de caja). Con la API real la lista llega vacia; en modo mock se usa el JSON.
export const gastosOperativosService = {
  async getAll(): Promise<GastoOperativo[]> {
    return listaOpcional(request<GastoOperativo[]>("gastos-operativos", "/gastos-operativos"));
  },
};
