import { request } from "./http";
import { USE_MOCKS } from "../config/api";
import type { Usuario } from "../types";

export interface Sesion {
  token: string;
  usuario: Usuario;
}

// Login: en modo real llama a POST /auth/login; en modo mock valida contra
// los usuarios de demostración (mockups/usuario.json) y acepta cualquier
// contraseña no vacía, para poder explorar la UI sin depender del backend.
export const authService = {
  async login(usuario: string, contrasenia: string): Promise<Sesion> {
    if (USE_MOCKS) {
      const usuarios = await request<Usuario[]>("usuario", "/usuarios");
      const encontrado = usuarios.find((u) => u.usuario === usuario);
      if (!encontrado) {
        throw new Error("Usuario no encontrado. Usa un usuario de demostración (p. ej. angel.admin).");
      }
      if (!contrasenia) {
        throw new Error("Ingresa una contraseña.");
      }
      return { token: `demo-${encontrado.id}-${Date.now()}`, usuario: encontrado };
    }

    return request<Sesion>("usuario", "/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario, contrasenia }),
    });
  },
};