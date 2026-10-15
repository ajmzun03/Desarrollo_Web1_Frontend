import { request } from "./http";
import type { FacturaCompra, FacturaCompraCreateInput } from "../types";

export const facturasCompraService = {
  async getAll(): Promise<FacturaCompra[]> {
    return request<FacturaCompra[]>("factura-compra", "/facturas-compra");
  },
  async getById(id: number): Promise<FacturaCompra> {
    return request<FacturaCompra>("factura-compra", `/facturas-compra/${id}`);
  },
  async create(data: FacturaCompraCreateInput): Promise<FacturaCompra> {
    return request<FacturaCompra>("factura-compra", "/facturas-compra", { method: "POST", body: JSON.stringify(data) });
  },
};