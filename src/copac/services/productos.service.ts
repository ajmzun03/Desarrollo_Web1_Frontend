import { request, toQuery } from "./http";
import type { Producto, ProductoInput, ProductoLote } from "../types";

export interface ProductoDisponibilidad extends Producto {
  disponible: number;
  agotado?: boolean;
  bajo_minimo?: boolean;
}

export const productosService = {
  // Lotes de producto terminado de una sucursal (requiere sesion de personal).
  async getStock(sucursalId: number): Promise<ProductoLote[]> {
    return request<ProductoLote[]>("producto-lote", `/productos/stock${toQuery({ sucursal_id: sucursalId })}`);
  },
  async getAll(): Promise<Producto[]> {
    return request<Producto[]>("producto", "/productos");
  },
  async getById(id: number): Promise<Producto> {
    return request<Producto>("producto", `/productos/${id}`);
  },
    async getDisponibilidad(sucursalId?: number): Promise<ProductoDisponibilidad[]> {
    return request<ProductoDisponibilidad[]>("producto", `/productos/disponibilidad${toQuery({ sucursal_id: sucursalId })}`);
  },
  async create(data: ProductoInput): Promise<Producto> {
    return request<Producto>("producto", "/productos", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<ProductoInput>): Promise<Producto> {
    return request<Producto>("producto", `/productos/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async updateStockMinimo(id: number, stockMinimo: number): Promise<Producto> {
    return request<Producto>("producto", `/productos/${id}/stock-minimo`, {
      method: "PATCH",
      body: JSON.stringify({ stock_minimo: stockMinimo }),
    });
  },
};