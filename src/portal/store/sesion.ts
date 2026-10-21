import { useSyncExternalStore } from "react";
import type { Cliente } from "../../copac/types";
import { CLAVE_CLIENTE, EVENTO_SESION_CLIENTE_EXPIRADA } from "../../copac/utils/sesion";

// Sesion del cliente del portal: datos del cliente y su JWT (POST /cliente/auth/*).
// Vive en localStorage; el cliente HTTP lee el token desde ahi para las rutas del portal.
export interface SesionCliente {
  cliente: Cliente;
  token: string;
}

const listeners = new Set<() => void>();
const avisar = () => listeners.forEach((l) => l());

const leer = (): SesionCliente | null => {
  try {
    const raw = localStorage.getItem(CLAVE_CLIENTE);
    const s = raw ? (JSON.parse(raw) as Partial<SesionCliente>) : null;
    return s?.cliente && s.token ? (s as SesionCliente) : null;
  } catch {
    return null;
  }
};

let actual: SesionCliente | null = leer();

const emitir = (s: SesionCliente | null) => {
  actual = s;
  try {
    if (s) localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(s));
    else localStorage.removeItem(CLAVE_CLIENTE);
  } catch {
    // Sin almacenamiento: la sesion dura mientras viva la pestana.
  }
  avisar();
};

// Si el backend responde 401 (token vencido o revocado) el cliente HTTP limpia el storage y avisa.
window.addEventListener(EVENTO_SESION_CLIENTE_EXPIRADA, () => {
  actual = null;
  avisar();
});

export const sesionCliente = {
  iniciar: (s: SesionCliente) => emitir(s),
  cerrar: () => emitir(null),
};

export const useSesionCliente = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => actual,
  );
