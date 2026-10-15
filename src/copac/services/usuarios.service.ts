import { request } from "./http";
import type { RolUsuario, Usuario } from "../types";

export interface UsuarioInput {
  usuario: string;
  correo_electronico: string;
  contrasenia: string;
  rol: RolUsuario;
}

export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    return request<Usuario[]>("usuario", "/usuarios");
  },
  async getById(id: number): Promise<Usuario> {
    return request<Usuario>("usuario", `/usuarios/${id}`);
  },
  async create(data: UsuarioInput): Promise<Usuario> {
    return request<Usuario>("usuario", "/usuarios", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: number, data: Partial<UsuarioInput>): Promise<Usuario> {
    return request<Usuario>("usuario", `/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
};