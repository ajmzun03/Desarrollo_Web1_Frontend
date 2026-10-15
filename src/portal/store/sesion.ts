import { useSyncExternalStore } from "react";
import type { Cliente } from "../../copac/types";

// Sesion del cliente del portal. La API V1 no tiene login de clientes (solo de
// personal), asi que se identifica al cliente por su registro en /clientes y se
// recuerda en localStorage. Token JWT opcional: solo existe si hay sesion de personal.
const KEY = "copac_cliente";
const listeners = new Set<() => void>();

const leer = (): Cliente | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cliente) : null;
  } catch {
    return null;
  }
};

let actual: Cliente | null = leer();

const emitir = (c: Cliente | null) => {
  actual = c;
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento: la sesion dura mientras viva la pestana.
  }
  listeners.forEach((l) => l());
};

export const sesionCliente = {
  iniciar: (c: Cliente) => emitir(c),
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
