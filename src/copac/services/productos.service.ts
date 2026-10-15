import { request, toQuery } from "./http";
import type { Producto, ProductoInput } from "../types";

export interface ProductoDisponibilidad extends Producto {
  disponible: number;
}

export const productosService = {
  async getAll(): Promise<Producto[]> {
    return request<Producto[]>("producto", "/productos");
  },
  async getById(id: number): Promise<Producto> {
    return request<Producto>("producto", `/productos/${id}`);
  },
  // Nota: hoy el endpoint devuelve productos sin disponibilidad real calculada.
  async getDisponibilidad(sucursalId?: number): Promise<ProductoDisponibilidad[]> {
    return request<ProductoDisponibilidad[]>("producto", `/productos/disponibilidad${toQuery({ sucursal_id: sucursalId })}`);
  },
  async create(data: ProductoInput): Promise<Producto> {
    return request<Producto>("producto", "/productos", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<ProductoInput>): Promise<Producto> {
    return request<Producto>("producto", `/productos/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  // TODO: endpoint existe pero PRODUCTO no tiene columna stock_minimo en la BD.
  async updateStockMinimo(id: number, stockMinimo: number): Promise<Producto> {
    return request<Producto>("producto", `/productos/${id}/stock-minimo`, {
      method: "PATCH",
      body: JSON.stringify({ stock_minimo: stockMinimo }),
    });
  },
};