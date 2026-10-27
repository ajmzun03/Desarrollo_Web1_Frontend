import { deleteCookie, getCookie } from "./cookies";

// El sistema tiene dos sesiones independientes: el personal (cookie "token", rutas /copac/*)
// y el cliente del portal (localStorage, resto de rutas). El backend rechaza el token de un
// tipo en rutas del otro, asi que cada peticion usa el que corresponde a la zona actual.
export const CLAVE_CLIENTE = "copac_cliente";
export const EVENTO_SESION_CLIENTE_EXPIRADA = "copac:sesion-cliente-expirada";

// Vistas (pantallas) permitidas al personal, tal como las entrega el backend en el login y en /auth/me.
// Van en localStorage y no en una cookie: la lista de un ADMIN no cabe en el limite de ~4 KB.
const CLAVE_VISTAS = "copac_vistas";

export function guardarVistas(vistas: string[]) {
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify(vistas));
  } catch {
    // Sin almacenamiento: se cae al control por rol.
  }
}

export function leerVistas(): string[] | null {
  try {
    const raw = localStorage.getItem(CLAVE_VISTAS);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(v) ? (v as string[]) : null;
  } catch {
    return null;
  }
}

export function borrarVistas() {
  try {
    localStorage.removeItem(CLAVE_VISTAS);
  } catch {
    // Nada que borrar.
  }
}

const enZonaPersonal = () => window.location.pathname.startsWith("/copac");

export function tokenCliente(): string | null {
  try {
    const raw = localStorage.getItem(CLAVE_CLIENTE);
    return raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
  } catch {
    return null;
  }
}

export function tokenActivo(): string | null {
  return enZonaPersonal() ? getCookie("token") : tokenCliente();
}

// Un 401 con token enviado significa sesion vencida o revocada: se limpia y se vuelve a pedir login.
export function sesionExpirada() {
  if (enZonaPersonal()) {
    deleteCookie("token");
    deleteCookie("usuario");
    borrarVistas();
    if (!window.location.pathname.startsWith("/copac/login")) window.location.assign("/copac/login");
  } else {
    try {
      localStorage.removeItem(CLAVE_CLIENTE);
    } catch {
      // Sin almacenamiento: nada que limpiar.
    }
    window.dispatchEvent(new Event(EVENTO_SESION_CLIENTE_EXPIRADA));
  }
}
