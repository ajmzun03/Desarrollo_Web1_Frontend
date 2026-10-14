import { request } from "./http";
import type { AuditoriaRegistro } from "../types";

// TEMPORAL: no existe tabla ni endpoint de auditoría en el backend.
// TODO: endpoint pendiente en backend.
export const auditoriaService = {
  async getAll(): Promise<AuditoriaRegistro[]> {
    return request<AuditoriaRegistro[]>("auditoria", "/auditoria");
  },
};
