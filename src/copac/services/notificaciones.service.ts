import { listaOpcional, request } from "./http";
import type { Notificacion } from "../types";

// El backend aun no tiene tabla ni endpoint de notificaciones: con la API real la lista llega
// vacia (404 controlado). En modo mock se lee de public/mockups/notificaciones.json.
export const notificacionesService = {
  async getAll(): Promise<Notificacion[]> {
    return listaOpcional(request<Notificacion[]>("notificaciones", "/notificaciones"));
  },
};
