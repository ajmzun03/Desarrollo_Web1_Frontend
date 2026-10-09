import { request, toQuery } from "./http";
import type { Departamento, Municipio, MunicipioInput } from "../types";

export const municipiosService = {
  async getAll(departamentoId?: number): Promise<Municipio[]> {
    return request<Municipio[]>("municipio", `/municipios${toQuery({ departamento_id: departamentoId })}`);
  },
  async getDepartamentos(): Promise<Departamento[]> {
    return request<Departamento[]>("departamento", "/municipios/departamentos");
  },
  async create(data: MunicipioInput): Promise<Municipio> {
    return request<Municipio>("municipio", "/municipios", { method: "POST", body: JSON.stringify(data) });
  },
};