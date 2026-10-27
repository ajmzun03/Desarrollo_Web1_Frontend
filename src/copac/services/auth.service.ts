import { request } from "./http";
import { USE_MOCKS } from "../config/api";
import type { Usuario } from "../types";

export interface Sesion {
  token: string;
  usuario: Usuario;
  /** Pantallas permitidas segun el backend (claves como "dashboard", "pos", "cocina"...). */
  vistas?: string[];
}

export type EstadoMfa = "verificar" | "enrolar";

// Paso 1 del login: el backend valida usuario y contrasena y pide el segundo factor (app
// autenticadora). En modo mock no hay segundo factor y se devuelve la sesion directamente.
export type ResultadoLogin =
  | { tipo: "sesion"; sesion: Sesion }
  | { tipo: "verificacion"; mfa: EstadoMfa; tmpToken: string };

interface RespuestaLogin {
  requiereVerificacion?: boolean;
  mfa?: EstadoMfa;
  tmpToken?: string;
  token?: string;
  usuario?: Usuario;
  vistas?: string[];
}

export interface Enrolamiento {
  /** Data URI SVG del QR: se muestra con <img src={qrCode}>. */
  qrCode: string;
  /** Secreto en texto, para quien no pueda escanear el QR. */
  secret: string;
  uri: string;
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
      return { tipo: "verificacion", mfa: r.mfa === "enrolar" ? "enrolar" : "verificar", tmpToken: r.tmpToken };
    }
    if (r.token && r.usuario) return { tipo: "sesion", sesion: { token: r.token, usuario: r.usuario, vistas: r.vistas } };
    throw new Error("Respuesta de inicio de sesión inesperada.");
  },

  // Solo la primera vez: crea el autenticador y devuelve el QR a escanear.
  async enrolar(tmpToken: string): Promise<Enrolamiento> {
    return request<Enrolamiento>("usuario", "/auth/mfa/enrolar", {
      method: "POST",
      body: JSON.stringify({ tmpToken }),
    });
  },

  // Paso 2: valida el codigo de 6 digitos del autenticador y devuelve la sesion.
  async verificar(tmpToken: string, codigo: string): Promise<Sesion> {
    return request<Sesion>("usuario", "/auth/verificar", {
      method: "POST",
      body: JSON.stringify({ tmpToken, codigo }),
    });
  },

  // Siempre responde 202 aunque el usuario no exista (anti-enumeracion): Supabase envia un correo con enlace.
  async recuperar(identificador: string): Promise<void> {
    await request<unknown>("usuario", "/auth/recuperar", {
      method: "POST",
      body: JSON.stringify({ identificador }),
    });
  },

  // tokenHash viene en el enlace del correo (?token_hash=...). 401 = enlace invalido, vencido o ya usado.
  async restablecer(tokenHash: string, nuevaContrasenia: string): Promise<void> {
    await request<unknown>("usuario", "/auth/restablecer", {
      method: "POST",
      body: JSON.stringify({ tokenHash, nuevaContrasenia }),
    });
  },

  // Solo ADMIN: elimina el autenticador de quien perdio su telefono y cierra sus sesiones.
  async reiniciarMfa(usuarioId: number): Promise<void> {
    await request<unknown>("usuario", `/auth/usuarios/${usuarioId}/mfa`, { method: "DELETE" });
  },

  // Vistas actuales del usuario autenticado (y valida que el token siga vigente).
  async me(): Promise<string[] | null> {
    if (USE_MOCKS) return null;
    const r = await request<{ vistas?: string[] }>("usuario", "/auth/me");
    return r.vistas ?? null;
  },

  async logout(): Promise<void> {
    try {
      await request<unknown>("usuario", "/auth/logout", { method: "POST" });
    } catch {
      // Si falla (token ya vencido) igual se limpia la sesion local.
    }
  },
};
