import { request } from "./http";
import type { Combo, ProductoExtra } from "../types";

// Catalogo publico: combos y extras de producto (GET sin autenticacion).
export const combosService = {
  async getAll(): Promise<Combo[]> {
    return request<Combo[]>("combo", "/combos");
  },
};

export const productosExtraService = {
  async getByProducto(productoId: number): Promise<ProductoExtra[]> {
    return request<ProductoExtra[]>("producto-extra", `/productos-extra/producto/${productoId}`);
  },
};
