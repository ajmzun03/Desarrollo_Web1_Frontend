import { request } from "./http";
import type { TurnoDespachador, TurnoAperturaInput, TurnoCierreInput, TurnoValidarInput } from "../types";

export const turnosService = {
  async getAll(): Promise<TurnoDespachador[]> {
    return request<TurnoDespachador[]>("turno-despachador", "/turnos");
  },
  async getPendientesValidacion(): Promise<TurnoDespachador[]> {
    return request<TurnoDespachador[]>("turno-despachador", "/turnos/pendientes-validacion");
  },
  async getById(id: number): Promise<TurnoDespachador> {
    return request<TurnoDespachador>("turno-despachador", `/turnos/${id}`);
  },
  async apertura(data: TurnoAperturaInput): Promise<TurnoDespachador> {
    return request<TurnoDespachador>("turno-despachador", "/turnos/apertura", { method: "POST", body: JSON.stringify(data) });
  },
  async cierre(id: number, data: TurnoCierreInput): Promise<TurnoDespachador> {
    return request<TurnoDespachador>("turno-despachador", `/turnos/${id}/cierre`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async validar(id: number, data: TurnoValidarInput): Promise<TurnoDespachador> {
    return request<TurnoDespachador>("turno-despachador", `/turnos/${id}/validar`, { method: "PATCH", body: JSON.stringify(data) });
  },
};