import { listaOpcional, request } from "./http";
import type { TrasladoInventario } from "../types";

// El backend solo permite crear traslados (POST /traslados); no hay listado. Con la API real la
// lista llega vacia (404 controlado). En modo mock se usa public/mockups/traslado-inventario.json.
export const trasladosService = {
  async getAll(): Promise<TrasladoInventario[]> {
    return listaOpcional(request<TrasladoInventario[]>("traslado-inventario", "/traslados"));
  },
};
