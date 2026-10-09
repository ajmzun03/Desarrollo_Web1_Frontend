import { request } from "./http";
import type { Notificacion } from "../types";

// TEMPORAL: no existe tabla ni endpoint de notificaciones en el backend.
// Cuando exista, reemplazar el mock por GET /notificaciones (o similar).
export const notificacionesService = {
  async getAll(): Promise<Notificacion[]> {
    // TODO: endpoint pendiente en backend.
    return request<Notificacion[]>("notificaciones", "/notificaciones");
  },
};