import { request } from "./http";
import type { TrasladoInventario } from "../types";

// TEMPORAL: no existe tabla ni endpoint de traslados de inventario en el backend.
// El único rastro es tipo_movimiento = "TRASLADO" dentro de KARDEX_BODEGA, que
// NO incluye origen/destino/estado. Se resuelve con el mock "traslado-inventario".
// TODO: endpoint pendiente en backend.
export const trasladosService = {
  async getAll(): Promise<TrasladoInventario[]> {
    return request<TrasladoInventario[]>("traslado-inventario", "/traslados");
  },
};
