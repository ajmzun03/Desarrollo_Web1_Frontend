import { request } from "./http";
import { USE_MOCKS } from "../config/api";
import type { Usuario } from "../types";

export interface Sesion {
  token: string;
  usuario: Usuario;
}

// Paso 1 del login: o el backend inicia sesion directamente (sin Redis en desarrollo) o pide
// el codigo de 6 digitos enviado por SMS/correo (2FA) y devuelve un token temporal.
export type ResultadoLogin =
  | { tipo: "sesion"; sesion: Sesion }
  | { tipo: "verificacion"; tmpToken: string; canal: string };

interface RespuestaLogin {
  requiereVerificacion?: boolean;
  tmpToken?: string;
  canal?: string;
  token?: string;
  usuario?: Usuario;
}

export const authService = {
  async login(usuario: string, contrasenia: string): Promise<ResultadoLogin> {
    if (USE_MOCKS) {
      const usuarios = await request<Usuario[]>("usuario", "/usuarios");
      const encontrado = usuarios.find((u) => u.usuario === usuario);
      if (!encontrado) {
        throw new Error("Usuario no encontrado. Usa un usuario de demostración (p. ej. angel.admin).");
      }
      if (!contrasenia) {
        throw new Error("Ingresa una contraseña.");
      }
      return { tipo: "sesion", sesion: { token: `demo-${encontrado.id}-${Date.now()}`, usuario: encontrado } };
    }

    const r = await request<RespuestaLogin>("usuario", "/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario, contrasenia }),
    });
    if (r.requiereVerificacion && r.tmpToken) {
      return { tipo: "verificacion", tmpToken: r.tmpToken, canal: r.canal ?? "" };
    }
    if (r.token && r.usuario) return { tipo: "sesion", sesion: { token: r.token, usuario: r.usuario } };
    throw new Error("Respuesta de inicio de sesión inesperada.");
  },

  // Paso 2: valida el codigo y devuelve la sesion.
  async verificar(tmpToken: string, codigo: string): Promise<Sesion> {
    return request<Sesion>("usuario", "/auth/verificar", {
      method: "POST",
      body: JSON.stringify({ tmpToken, codigo }),
    });
  },

  // Siempre responde 202 aunque el usuario no exista (anti-enumeracion).
  async recuperar(identificador: string): Promise<void> {
    await request<unknown>("usuario", "/auth/recuperar", {
      method: "POST",
      body: JSON.stringify({ identificador }),
    });
  },

  async restablecer(identificador: string, codigo: string, nuevaContrasenia: string): Promise<void> {
    await request<unknown>("usuario", "/auth/restablecer", {
      method: "POST",
      body: JSON.stringify({ identificador, codigo, nuevaContrasenia }),
    });
  },

  async logout(): Promise<void> {
    try {
      await request<unknown>("usuario", "/auth/logout", { method: "POST" });
    } catch {
      // Si falla (token ya vencido) igual se limpia la sesion local.
    }
  },
};
