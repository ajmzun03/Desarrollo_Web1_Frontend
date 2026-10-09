import { request, toQuery } from "./http";
import type { LiquidacionRepartidor, LiquidacionCreateInput } from "../types";

export const liquidacionesService = {
  async getAll(turnoId?: number): Promise<LiquidacionRepartidor[]> {
    return request<LiquidacionRepartidor[]>("liquidacion-repartidor", `/liquidaciones${toQuery({ turno_id: turnoId })}`);
  },
  async getById(id: number): Promise<LiquidacionRepartidor> {
    return request<LiquidacionRepartidor>("liquidacion-repartidor", `/liquidaciones/${id}`);
  },
  async create(data: LiquidacionCreateInput): Promise<LiquidacionRepartidor> {
    return request<LiquidacionRepartidor>("liquidacion-repartidor", "/liquidaciones", { method: "POST", body: JSON.stringify(data) });
  },
};