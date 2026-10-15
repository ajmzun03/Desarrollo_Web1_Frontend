import { request } from "./http";
import type { CuadreInventario } from "../types";

// TEMPORAL: no existe tabla ni endpoint de cuadre de inventario en el backend.
// Se resuelve con el mock "cuadre-inventario".
// TODO: endpoint pendiente en backend.
export const cuadreService = {
  async getAll(): Promise<CuadreInventario[]> {
    return request<CuadreInventario[]>("cuadre-inventario", "/cuadres");
  },
};
