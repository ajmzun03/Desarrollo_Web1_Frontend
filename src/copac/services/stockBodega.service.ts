import { request, toQuery } from "./http";
import type { StockBodega } from "../types";

export const stockBodegaService = {
  async getAll(bodegaId?: number): Promise<StockBodega[]> {
    return request<StockBodega[]>("stock-bodega", `/stock-bodega${toQuery({ bodega_id: bodegaId })}`);
  },
};