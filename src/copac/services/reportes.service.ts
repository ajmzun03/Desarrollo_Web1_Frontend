import { request, toQuery } from "./http";
import type { Usuario } from "../types";

// Nota: GET /reportes/repartidores/disponibles existe con query sucursal_id.
// El resto de reportes no se usan todavia en las 5 vistas.
export const reportesService = {
  async getRepartidoresDisponibles(sucursalId?: number): Promise<Usuario[]> {
    return request<Usuario[]>("usuario", `/reportes/repartidores/disponibles${toQuery({ sucursal_id: sucursalId })}`);
  },
};