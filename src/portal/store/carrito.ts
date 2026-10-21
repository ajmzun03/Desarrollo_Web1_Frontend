import { useSyncExternalStore } from "react";

// Carrito del portal del cliente. Vive en localStorage para sobrevivir recargas.
// Un item es un producto o un combo; los productos pueden llevar extras (con precio, validados
// por el backend) y una nota libre que viaja en las observaciones del pedido.
export interface ExtraCarrito {
  id: number;
  nombre: string;
  precio: number;
}

export interface ItemCarrito {
  clave: string;
  tipo: "producto" | "combo";
  refId: number; // producto_id o combo_id
  nombre: string;
  precio: number; // precio base de una unidad, sin extras
  imagen_url?: string | null;
  cantidad: number;
  nota: string;
  extras: ExtraCarrito[];
}

export type NuevoItem = Omit<ItemCarrito, "clave" | "cantidad" | "nota" | "extras"> & {
  cantidad?: number;
  nota?: string;
  extras?: ExtraCarrito[];
};

const KEY = "copac_carrito_v2";
const listeners = new Set<() => void>();

const leer = (): ItemCarrito[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
};

// Instantanea inmutable: useSyncExternalStore exige la misma referencia entre cambios.
let items: ItemCarrito[] = leer();

const guardar = (siguiente: ItemCarrito[]) => {
  items = siguiente;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Sin almacenamiento disponible: el carrito vive solo en memoria.
  }
  listeners.forEach((l) => l());
};

const suscribir = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const claveDe = (tipo: string, refId: number, extras: ExtraCarrito[], nota: string) =>
  `${tipo}-${refId}-${extras.map((e) => e.id).sort((a, b) => a - b).join(",")}-${nota}`;

export const precioUnitario = (i: ItemCarrito) => i.precio + i.extras.reduce((a, e) => a + e.precio, 0);

export const carrito = {
  agregar(nuevo: NuevoItem) {
    const cantidad = nuevo.cantidad ?? 1;
    const nota = nuevo.nota ?? "";
    const extras = nuevo.extras ?? [];
    const clave = claveDe(nuevo.tipo, nuevo.refId, extras, nota);
    const existente = items.find((i) => i.clave === clave);
    if (existente) {
      guardar(items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + cantidad } : i)));
    } else {
      guardar([...items, { ...nuevo, clave, cantidad, nota, extras }]);
    }
  },
  setCantidad(clave: string, cantidad: number) {
    if (cantidad <= 0) return carrito.quitar(clave);
    guardar(items.map((i) => (i.clave === clave ? { ...i, cantidad } : i)));
  },
  quitar(clave: string) {
    guardar(items.filter((i) => i.clave !== clave));
  },
  vaciar() {
    guardar([]);
  },
};

export const useCarrito = () => {
  const lista = useSyncExternalStore(suscribir, () => items);
  const cantidadTotal = lista.reduce((acc, i) => acc + i.cantidad, 0);
  const subtotal = lista.reduce((acc, i) => acc + precioUnitario(i) * i.cantidad, 0);
  return { items: lista, cantidadTotal, subtotal };
};
