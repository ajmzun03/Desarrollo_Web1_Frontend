import { request, toQuery } from "./http";
import type { StockAlacena } from "../types";

export const stockAlacenaService = {
  async getAll(alacenaId?: number): Promise<StockAlacena[]> {
    return request<StockAlacena[]>("stock-alacena", `/stock-alacena${toQuery({ alacena_id: alacenaId })}`);
  },
};