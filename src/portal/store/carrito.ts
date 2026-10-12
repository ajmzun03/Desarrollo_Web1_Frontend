import { useSyncExternalStore } from "react";

// Carrito del portal del cliente. Vive en localStorage para sobrevivir recargas.
// Las personalizaciones ("Sin cebolla", notas) se guardan en `nota` y viajan como
// `observaciones` del pedido: la API V1 no soporta extras con precio.
export interface ItemCarrito {
  productoId: number;
  nombre: string;
  precio: number;
  imagen_url?: string | null;
  cantidad: number;
  nota: string;
}

const KEY = "copac_carrito";
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

export const carrito = {
  agregar(nuevo: Omit<ItemCarrito, "cantidad" | "nota"> & { cantidad?: number; nota?: string }) {
    const cantidad = nuevo.cantidad ?? 1;
    const nota = nuevo.nota ?? "";
    const existente = items.find((i) => i.productoId === nuevo.productoId && i.nota === nota);
    if (existente) {
      guardar(items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + cantidad } : i)));
    } else {
      guardar([...items, { ...nuevo, cantidad, nota }]);
    }
  },
  setCantidad(productoId: number, nota: string, cantidad: number) {
    if (cantidad <= 0) return carrito.quitar(productoId, nota);
    guardar(items.map((i) => (i.productoId === productoId && i.nota === nota ? { ...i, cantidad } : i)));
  },
  quitar(productoId: number, nota: string) {
    guardar(items.filter((i) => !(i.productoId === productoId && i.nota === nota)));
  },
  vaciar() {
    guardar([]);
  },
};

export const useCarrito = () => {
  const lista = useSyncExternalStore(suscribir, () => items);
  const cantidadTotal = lista.reduce((acc, i) => acc + i.cantidad, 0);
  const subtotal = lista.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  return { items: lista, cantidadTotal, subtotal };
};
