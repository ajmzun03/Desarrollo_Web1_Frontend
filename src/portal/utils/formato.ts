import type { EstadoPedido } from "../../copac/types";

export const quetzales = (n: number) => `Q${Number(n).toFixed(2)}`;

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

export const numeroPedido = (id: number) => `#COPAC-${id}`;

// Emoji por categoria (la API solo expone el nombre). Se usa cuando el producto no tiene imagen_url.
export const emojiDeCategoria = (nombre: string): string => {
  const n = nombre.toLowerCase();
  if (/combo/.test(n)) return "🥘";
  if (/burger|hamburg/.test(n)) return "🍔";
  if (/pollo|nugget/.test(n)) return "🍗";
  if (/papa|acompa/.test(n)) return "🍟";
  if (/bebida|refresco|jugo|cafe|café/.test(n)) return "🥤";
  if (/postre|helado|dulce|pastel/.test(n)) return "🍰";
  if (/desayuno/.test(n)) return "🍳";
  if (/pizza/.test(n)) return "🍕";
  if (/pan|panader/.test(n)) return "🥖";
  if (/ensalada|verdura/.test(n)) return "🥗";
  if (/promo/.test(n)) return "🏷️";
  return "🍽️";
};

// Pasos del seguimiento. El backend tiene 7 estados; EN_DESPACHO y EN_RUTA se muestran como "En camino".
// ANULADO queda fuera de la linea de tiempo normal.
export const PASOS_PEDIDO: { estado: EstadoPedido; etiqueta: string; mensaje: string }[] = [
  { estado: "CREADO", etiqueta: "Pedido recibido", mensaje: "Recibimos tu pedido y lo estamos revisando." },
  { estado: "EN_PREPARACION", etiqueta: "En preparación", mensaje: "La cocina está preparando tu pedido." },
  { estado: "LISTO", etiqueta: "Listo", mensaje: "Tu pedido está preparado y espera al repartidor." },
  { estado: "EN_RUTA", etiqueta: "En camino", mensaje: "Tu pedido va en camino a tu dirección." },
  { estado: "ENTREGADO", etiqueta: "Entregado", mensaje: "¡Buen provecho! Tu pedido fue entregado." },
];

export const indicePaso = (estado: EstadoPedido) =>
  PASOS_PEDIDO.findIndex((p) => p.estado === (estado === "EN_DESPACHO" ? "EN_RUTA" : estado));
