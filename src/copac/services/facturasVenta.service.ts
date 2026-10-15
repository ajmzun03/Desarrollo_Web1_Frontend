import { request, toQuery } from "./http";
import type { FacturaVenta, FacturaVentaCreateInput } from "../types";

export const facturasVentaService = {
  async getAll(pedidoId?: number): Promise<FacturaVenta[]> {
    return request<FacturaVenta[]>("factura-venta", `/facturas-venta${toQuery({ pedido_id: pedidoId })}`);
  },
  async getById(id: number): Promise<FacturaVenta> {
    return request<FacturaVenta>("factura-venta", `/facturas-venta/${id}`);
  },
  async create(data: FacturaVentaCreateInput): Promise<FacturaVenta> {
    return request<FacturaVenta>("factura-venta", "/facturas-venta", { method: "POST", body: JSON.stringify(data) });
  },
};