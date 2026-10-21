import { listaOpcional, request } from "./http";
import type { CuadreInventario } from "../types";

// El backend solo permite registrar un cuadre (POST /inventario/cuadre); no hay listado. Con la
// API real la lista llega vacia (404 controlado). En modo mock se usa public/mockups/cuadre-inventario.json.
export const cuadreService = {
  async getAll(): Promise<CuadreInventario[]> {
    return listaOpcional(request<CuadreInventario[]>("cuadre-inventario", "/cuadres"));
  },
};
